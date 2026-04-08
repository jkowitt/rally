import { supabase } from './supabase'

// Run automations matching a trigger event
export async function runAutomations(propertyId, triggerType, triggerData = {}) {
  try {
    const { data: rules } = await supabase
      .from('automations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('trigger_type', triggerType)
      .eq('active', true)

    if (!rules?.length) return []

    const results = []
    for (const rule of rules) {
      // Check trigger conditions
      if (!matchTrigger(rule, triggerData)) continue

      try {
        const result = await executeAction(rule, triggerData, propertyId)
        results.push({ rule: rule.name, success: true, result })

        // Log execution
        await supabase.from('automation_log').insert({
          automation_id: rule.id,
          trigger_data: triggerData,
          action_result: result,
          success: true,
        })

        // Update run count
        await supabase.from('automations').update({
          run_count: (rule.run_count || 0) + 1,
          last_run_at: new Date().toISOString(),
        }).eq('id', rule.id)

      } catch (err) {
        results.push({ rule: rule.name, success: false, error: err.message })
        await supabase.from('automation_log').insert({
          automation_id: rule.id,
          trigger_data: triggerData,
          success: false,
          error_message: err.message,
        })
      }
    }

    // Fire webhooks for this event
    fireWebhooks(propertyId, triggerType, triggerData)

    return results
  } catch (err) {
    console.warn('Automation engine error:', err)
    return []
  }
}

function matchTrigger(rule, data) {
  const config = rule.trigger_config || {}

  if (rule.trigger_type === 'deal_stage_change') {
    if (config.from_stage && data.from_stage !== config.from_stage) return false
    if (config.to_stage && data.to_stage !== config.to_stage) return false
    return true
  }

  if (rule.trigger_type === 'deal_stale') {
    const days = config.days || 14
    return data.days_stale >= days
  }

  if (rule.trigger_type === 'deal_value_change') {
    if (config.min_value && (data.new_value || 0) < config.min_value) return false
    return true
  }

  // All other triggers: match if active
  return true
}

async function executeAction(rule, triggerData, propertyId) {
  const config = rule.action_config || {}
  const action = rule.action_type

  if (action === 'send_notification') {
    // Store as an activity/note
    await supabase.from('activities').insert({
      property_id: propertyId,
      deal_id: triggerData.deal_id || null,
      activity_type: 'Automation',
      subject: config.message || `Automation: ${rule.name}`,
      notes: `Triggered by: ${rule.trigger_type}. ${JSON.stringify(triggerData)}`,
      occurred_at: new Date().toISOString(),
    })
    return { notified: true }
  }

  if (action === 'create_task') {
    const { data } = await supabase.from('tasks').insert({
      property_id: propertyId,
      deal_id: triggerData.deal_id || null,
      title: config.title || `Auto: ${rule.name}`,
      description: config.description || '',
      priority: config.priority || 'Medium',
      status: 'To Do',
      due_date: config.due_days ? new Date(Date.now() + config.due_days * 86400000).toISOString().slice(0, 10) : null,
      assigned_to: config.assign_to || triggerData.assigned_to || null,
    }).select().single()
    return { task_created: data?.id }
  }

  if (action === 'update_deal') {
    const updates = {}
    if (config.set_stage) updates.stage = config.set_stage
    if (config.set_priority) updates.priority = config.set_priority
    if (config.set_assigned_to) updates.assigned_to = config.set_assigned_to
    if (Object.keys(updates).length > 0 && triggerData.deal_id) {
      await supabase.from('deals').update(updates).eq('id', triggerData.deal_id)
    }
    return { deal_updated: updates }
  }

  if (action === 'create_fulfillment') {
    if (!triggerData.deal_id) return { skipped: 'no deal_id' }
    const { data: contracts } = await supabase.from('contracts').select('id, contract_benefits(*)').eq('deal_id', triggerData.deal_id)
    let count = 0
    for (const c of (contracts || [])) {
      for (const b of (c.contract_benefits || [])) {
        await supabase.from('fulfillment_records').insert({
          deal_id: triggerData.deal_id,
          contract_id: c.id,
          benefit_id: b.id,
          auto_generated: true,
          delivered: false,
        })
        count++
      }
    }
    return { fulfillment_created: count }
  }

  if (action === 'create_activity') {
    await supabase.from('activities').insert({
      property_id: propertyId,
      deal_id: triggerData.deal_id || null,
      activity_type: config.activity_type || 'Note',
      subject: config.subject || rule.name,
      notes: config.notes || '',
      occurred_at: new Date().toISOString(),
    })
    return { activity_created: true }
  }

  if (action === 'webhook') {
    if (!config.url) return { skipped: 'no url' }
    await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      body: JSON.stringify({ trigger: rule.trigger_type, data: triggerData, automation: rule.name }),
    })
    return { webhook_sent: config.url }
  }

  return { action, skipped: 'unknown action type' }
}

async function fireWebhooks(propertyId, event, data) {
  try {
    const { data: hooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('property_id', propertyId)
      .eq('active', true)
      .contains('events', [event])

    for (const hook of (hooks || [])) {
      try {
        await fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(hook.headers || {}) },
          body: JSON.stringify({
            event,
            data,
            timestamp: new Date().toISOString(),
            property_id: propertyId,
          }),
        })
        await supabase.from('webhooks').update({ last_triggered_at: new Date().toISOString() }).eq('id', hook.id)
      } catch { /* webhook failures are non-blocking */ }
    }
  } catch { /* non-blocking */ }
}

// Pre-built automation templates
export const AUTOMATION_TEMPLATES = [
  {
    name: 'Auto-create fulfillment on Contracted',
    trigger_type: 'deal_stage_change',
    trigger_config: { to_stage: 'Contracted' },
    action_type: 'create_fulfillment',
    action_config: {},
  },
  {
    name: 'Notify admin on new deal',
    trigger_type: 'deal_created',
    trigger_config: {},
    action_type: 'send_notification',
    action_config: { message: 'New deal added to pipeline' },
  },
  {
    name: 'Create follow-up task on Proposal Sent',
    trigger_type: 'deal_stage_change',
    trigger_config: { to_stage: 'Proposal Sent' },
    action_type: 'create_task',
    action_config: { title: 'Follow up on proposal', priority: 'High', due_days: 3 },
  },
  {
    name: 'Alert on stale deals (14+ days)',
    trigger_type: 'deal_stale',
    trigger_config: { days: 14 },
    action_type: 'create_task',
    action_config: { title: 'Re-engage stale deal', priority: 'High', due_days: 1 },
  },
  {
    name: 'Log activity on contract signed',
    trigger_type: 'contract_signed',
    trigger_config: {},
    action_type: 'create_activity',
    action_config: { activity_type: 'Note', subject: 'Contract signed!', notes: 'Contract has been executed.' },
  },
  {
    name: 'Webhook on deal stage change',
    trigger_type: 'deal_stage_change',
    trigger_config: {},
    action_type: 'webhook',
    action_config: { url: '' },
  },
]

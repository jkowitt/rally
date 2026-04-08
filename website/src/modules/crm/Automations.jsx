import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { AUTOMATION_TEMPLATES } from '@/lib/automations'

const TRIGGER_LABELS = {
  deal_stage_change: 'Deal stage changes',
  deal_created: 'New deal created',
  deal_stale: 'Deal goes stale',
  contract_signed: 'Contract is signed',
  fulfillment_overdue: 'Fulfillment item overdue',
  prospect_added: 'Prospect added',
  trial_expiring: 'Trial expiring',
  contact_added: 'Contact added',
  task_overdue: 'Task overdue',
  deal_value_change: 'Deal value changes',
}

const ACTION_LABELS = {
  send_notification: 'Send notification',
  create_task: 'Create a task',
  update_deal: 'Update deal fields',
  send_email: 'Send email',
  create_fulfillment: 'Create fulfillment records',
  research_contacts: 'Research contacts',
  assign_user: 'Assign user',
  create_activity: 'Log activity',
  webhook: 'Send webhook',
}

export default function Automations() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const [showCreate, setShowCreate] = useState(false)

  const { data: automations, isLoading } = useQuery({
    queryKey: ['automations', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('automations').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: logs } = useQuery({
    queryKey: ['automation-logs', propertyId],
    queryFn: async () => {
      const ids = (automations || []).map(a => a.id)
      if (!ids.length) return []
      const { data } = await supabase.from('automation_log').select('*').in('automation_id', ids).order('executed_at', { ascending: false }).limit(50)
      return data || []
    },
    enabled: !!(automations?.length),
  })

  const { data: webhooks } = useQuery({
    queryKey: ['webhooks', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('webhooks').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!propertyId,
  })

  const createMutation = useMutation({
    mutationFn: async (auto) => {
      const { error } = await supabase.from('automations').insert({ ...auto, property_id: propertyId, created_by: profile?.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
      toast({ title: 'Automation created', type: 'success' })
      setShowCreate(false)
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }) => {
      await supabase.from('automations').update({ active }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await supabase.from('automations').delete().eq('id', id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
      toast({ title: 'Automation deleted', type: 'success' })
    },
  })

  const createWebhookMutation = useMutation({
    mutationFn: async (hook) => {
      const { error } = await supabase.from('webhooks').insert({ ...hook, property_id: propertyId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast({ title: 'Webhook created', type: 'success' })
    },
  })

  const activeCount = (automations || []).filter(a => a.active).length
  const totalRuns = (automations || []).reduce((s, a) => s + (a.run_count || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Automations</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            {activeCount} active &middot; {totalRuns} total runs
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">
          + New Automation
        </button>
      </div>

      {/* Templates */}
      {showCreate && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Create from Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AUTOMATION_TEMPLATES.map((tmpl, i) => (
              <button
                key={i}
                onClick={() => createMutation.mutate(tmpl)}
                className="text-left bg-bg-card border border-border rounded-lg p-3 hover:border-accent/50 transition-colors"
              >
                <div className="text-sm text-text-primary font-medium">{tmpl.name}</div>
                <div className="text-[10px] text-text-muted font-mono mt-1">
                  When: {TRIGGER_LABELS[tmpl.trigger_type]} → Then: {ACTION_LABELS[tmpl.action_type]}
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(false)} className="text-xs text-text-muted hover:text-text-secondary">Cancel</button>
        </div>
      )}

      {/* Active Automations */}
      <div className="space-y-2">
        {(automations || []).map(auto => (
          <div key={auto.id} className={`bg-bg-surface border rounded-lg p-4 ${auto.active ? 'border-border' : 'border-border opacity-50'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-text-primary font-medium">{auto.name}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${auto.active ? 'bg-success/10 text-success' : 'bg-bg-card text-text-muted'}`}>
                    {auto.active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="text-xs text-text-muted font-mono mt-1">
                  When: <span className="text-text-secondary">{TRIGGER_LABELS[auto.trigger_type]}</span>
                  {auto.trigger_config && Object.keys(auto.trigger_config).length > 0 && (
                    <span className="text-text-muted"> ({Object.entries(auto.trigger_config).map(([k, v]) => `${k}: ${v}`).join(', ')})</span>
                  )}
                </div>
                <div className="text-xs text-text-muted font-mono">
                  Then: <span className="text-text-secondary">{ACTION_LABELS[auto.action_type]}</span>
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  {auto.run_count || 0} runs {auto.last_run_at && `· Last: ${new Date(auto.last_run_at).toLocaleString()}`}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: auto.id, active: !auto.active })}
                  className={`text-[10px] font-mono px-2 py-1 rounded ${auto.active ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}
                >
                  {auto.active ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => { if (confirm('Delete this automation?')) deleteMutation.mutate(auto.id) }}
                  className="text-[10px] text-text-muted hover:text-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {(!automations || automations.length === 0) && !isLoading && (
          <div className="bg-bg-surface border border-border rounded-lg p-8 text-center">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-text-secondary text-sm">No automations yet</p>
            <p className="text-text-muted text-xs mt-1">Create one from a template to automate your workflow</p>
          </div>
        )}
      </div>

      {/* Webhooks */}
      <div className="bg-bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">Webhooks (Zapier / Slack / Custom)</h3>
          <button
            onClick={() => {
              const url = prompt('Webhook URL:')
              if (!url) return
              const name = prompt('Name:', 'My Webhook')
              createWebhookMutation.mutate({
                name: name || 'Webhook',
                url,
                events: ['deal_stage_change', 'deal_created', 'contract_signed'],
              })
            }}
            className="text-[10px] text-accent hover:underline"
          >
            + Add Webhook
          </button>
        </div>
        {(webhooks || []).length > 0 ? (
          <div className="space-y-2">
            {webhooks.map(hook => (
              <div key={hook.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm text-text-primary">{hook.name}</span>
                  <span className="text-[10px] text-text-muted font-mono ml-2 truncate">{hook.url.slice(0, 40)}...</span>
                  <div className="text-[9px] text-text-muted mt-0.5">Events: {hook.events?.join(', ')}</div>
                </div>
                <span className={`text-[10px] font-mono ${hook.active ? 'text-success' : 'text-text-muted'}`}>{hook.active ? 'Active' : 'Off'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">No webhooks configured. Add one to send data to Zapier, Slack, or any URL when events occur.</p>
        )}
      </div>

      {/* Recent Execution Log */}
      {(logs || []).length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Recent Executions</h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-success' : 'bg-danger'}`} />
                  <span className="text-[10px] text-text-secondary">{log.trigger_data?.deal_id?.slice(0, 8) || 'system'}</span>
                </div>
                <span className="text-[9px] text-text-muted font-mono">{new Date(log.executed_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

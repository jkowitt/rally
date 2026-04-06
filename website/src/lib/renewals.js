import { supabase } from './supabase'

// Check for contracts expiring in the next 90 days and auto-create renewal tasks
export async function checkAndCreateRenewalTasks(propertyId, userId) {
  if (!propertyId) return { created: 0 }

  const now = new Date()
  const in90 = new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  // Find contracts expiring within 90 days
  const { data: expiring } = await supabase
    .from('contracts')
    .select('id, brand_name, deal_id, expiration_date')
    .eq('property_id', propertyId)
    .gte('expiration_date', todayStr)
    .lte('expiration_date', in90)
    .in('status', ['Signed', 'Final'])

  if (!expiring?.length) return { created: 0 }

  // Check which already have renewal tasks
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('deal_id, title')
    .eq('property_id', propertyId)
    .like('title', '%Renewal%')

  const existingDealIds = new Set((existingTasks || []).map(t => t.deal_id))

  let created = 0
  for (const contract of expiring) {
    if (!contract.deal_id || existingDealIds.has(contract.deal_id)) continue

    const daysUntil = Math.ceil((new Date(contract.expiration_date) - now) / 86400000)

    // Create 90-day, 60-day, and 30-day renewal tasks
    const milestones = [
      { days: 90, title: `Start renewal conversation — ${contract.brand_name}`, priority: 'Low' },
      { days: 60, title: `Send renewal proposal — ${contract.brand_name}`, priority: 'Medium' },
      { days: 30, title: `Finalize renewal — ${contract.brand_name}`, priority: 'High' },
    ]

    for (const m of milestones) {
      if (daysUntil <= m.days) {
        const dueDate = new Date(new Date(contract.expiration_date).getTime() - m.days * 86400000)
        if (dueDate < now) continue // Skip past milestones

        try {
          await supabase.from('tasks').insert({
            property_id: propertyId,
            deal_id: contract.deal_id,
            title: m.title,
            description: `Contract ${contract.brand_name} expires ${contract.expiration_date}. Auto-generated renewal task.`,
            due_date: dueDate.toISOString().split('T')[0],
            priority: m.priority,
            status: 'Pending',
            created_by: userId,
          })
          created++
        } catch (e) { console.warn(e) }
      }
    }

    existingDealIds.add(contract.deal_id) // Prevent duplicates within this run
  }

  return { created }
}

// Get renewal pipeline summary
export async function getRenewalPipeline(propertyId) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const in365 = new Date(now.getTime() + 365 * 86400000).toISOString().split('T')[0]

  const { data } = await supabase
    .from('contracts')
    .select('id, brand_name, deal_id, total_value, expiration_date, deals(brand_name, value, stage)')
    .eq('property_id', propertyId)
    .gte('expiration_date', todayStr)
    .lte('expiration_date', in365)
    .in('status', ['Signed', 'Final'])
    .order('expiration_date')

  return data || []
}

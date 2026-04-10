import { supabase } from '@/lib/supabase'

// Build daily digest data (used by Edge Function AND admin preview page)
export async function buildDailyDigest() {
  const yesterday = new Date(Date.now() - 86400000).toISOString()

  const [newSignups, newPaidSignups, failedPayments, hotLeads, activeChurnRisks, todaysOpps] = await Promise.all([
    supabase.from('profiles').select('full_name, email, created_at, properties!profiles_property_id_fkey(name, plan)').gte('created_at', yesterday).order('created_at', { ascending: false }),
    supabase.from('profiles').select('full_name, email, properties!profiles_property_id_fkey(name, plan)').gte('created_at', yesterday).not('properties.plan', 'eq', 'free'),
    supabase.from('automation_log').select('*').eq('event_category', 'payment').eq('event_type', 'payment_failed').gte('created_at', yesterday),
    supabase.from('user_engagement_scores').select('*, profiles(full_name, email)').eq('tag', 'hot').order('calculated_at', { ascending: false }).limit(10),
    supabase.from('churn_risks').select('*, profiles(full_name, email)').is('resolved_at', null).order('flagged_at', { ascending: false }).limit(10),
    supabase.from('upgrade_opportunities').select('*, profiles(full_name, email)').is('actioned_at', null).gte('flagged_at', yesterday),
  ])

  // Revenue snapshot
  const { data: allPaidUsers } = await supabase
    .from('profiles')
    .select('properties!profiles_property_id_fkey(plan)')
  const paidCount = (allPaidUsers || []).filter(p => ['starter', 'pro', 'enterprise'].includes(p.properties?.plan)).length
  const freeCount = (allPaidUsers || []).filter(p => (p.properties?.plan || 'free') === 'free').length

  // Estimate MRR from plan counts
  let mrr = 0
  ;(allPaidUsers || []).forEach(p => {
    const plan = p.properties?.plan
    if (plan === 'starter') mrr += 39
    else if (plan === 'pro') mrr += 199
  })

  // Automation health
  const { count: emailsSent } = await supabase
    .from('automation_log')
    .select('*', { count: 'exact', head: true })
    .eq('event_category', 'email')
    .eq('status', 'sent')
    .gte('created_at', yesterday)

  const { count: failedAutomations } = await supabase
    .from('automation_log')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('created_at', yesterday)

  return {
    date: new Date().toISOString().slice(0, 10),
    newSignups: newSignups.data || [],
    newPaidSignups: newPaidSignups.data || [],
    failedPayments: failedPayments.data || [],
    hotLeads: hotLeads.data || [],
    churnRisks: activeChurnRisks.data || [],
    upgradeOpportunities: todaysOpps.data || [],
    revenue: { mrr, paidCount, freeCount },
    automation: {
      emailsSent: emailsSent || 0,
      failedAutomations: failedAutomations || 0,
    },
  }
}

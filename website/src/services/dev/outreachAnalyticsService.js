import { supabase } from '@/lib/supabase'

/**
 * Personal outreach analytics. Computes funnel, volume, and template
 * performance from outlook_prospects, outlook_emails, and outlook_template_usage.
 */

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export async function getVolumeMetrics() {
  const [weekEmails, monthEmails, weekProspects, monthProspects] = await Promise.all([
    supabase.from('outlook_emails').select('id', { count: 'exact', head: true }).eq('is_sent', true).gte('sent_at', daysAgo(7)),
    supabase.from('outlook_emails').select('id', { count: 'exact', head: true }).eq('is_sent', true).gte('sent_at', daysAgo(30)),
    supabase.from('outlook_prospects').select('id', { count: 'exact', head: true }).gte('created_at', daysAgo(7)),
    supabase.from('outlook_prospects').select('id', { count: 'exact', head: true }).gte('created_at', daysAgo(30)),
  ])
  return {
    emailsThisWeek: weekEmails.count || 0,
    emailsThisMonth: monthEmails.count || 0,
    prospectsThisWeek: weekProspects.count || 0,
    prospectsThisMonth: monthProspects.count || 0,
  }
}

export async function getFunnelMetrics() {
  const { data } = await supabase.from('outlook_prospects').select('outreach_status')
  const rows = data || []
  const total = rows.length
  const contacted = rows.filter(r => r.outreach_status !== 'not_contacted').length
  const responded = rows.filter(r => ['responded', 'demo_scheduled', 'trial_started', 'converted'].includes(r.outreach_status)).length
  const demos = rows.filter(r => ['demo_scheduled', 'trial_started', 'converted'].includes(r.outreach_status)).length
  const trials = rows.filter(r => ['trial_started', 'converted'].includes(r.outreach_status)).length
  const converted = rows.filter(r => r.outreach_status === 'converted').length

  const pct = (num, denom) => (denom > 0 ? Math.round((num / denom) * 100) : 0)

  return {
    total,
    contacted,
    responded,
    demos,
    trials,
    converted,
    responseRate: pct(responded, contacted),
    demoRate: pct(demos, responded),
    trialRate: pct(trials, demos),
    conversionRate: pct(converted, trials),
    overallRate: pct(converted, total),
  }
}

export async function getTemplatePerformance() {
  const { data: templates } = await supabase.from('outlook_templates').select('id, name, stage, times_used')
  const { data: usage } = await supabase.from('outlook_template_usage').select('template_id, got_response, resulted_in_demo, resulted_in_trial, resulted_in_paid')

  return (templates || []).map(t => {
    const rows = (usage || []).filter(u => u.template_id === t.id)
    const sent = rows.length
    const responses = rows.filter(r => r.got_response).length
    const demos = rows.filter(r => r.resulted_in_demo).length
    return {
      id: t.id,
      name: t.name,
      stage: t.stage,
      sent,
      responseRate: sent ? Math.round((responses / sent) * 100) : 0,
      demoRate: sent ? Math.round((demos / sent) * 100) : 0,
    }
  })
}

/** Average days between key funnel stages. */
export async function getTimingMetrics() {
  const { data } = await supabase
    .from('outlook_prospects')
    .select('first_contacted_at, signed_up_at, converted_at')
  const rows = data || []
  let firstToSignupSum = 0, firstToSignupN = 0
  let signupToPaidSum = 0, signupToPaidN = 0
  rows.forEach(r => {
    if (r.first_contacted_at && r.signed_up_at) {
      const days = (new Date(r.signed_up_at) - new Date(r.first_contacted_at)) / 86400000
      if (days >= 0) { firstToSignupSum += days; firstToSignupN++ }
    }
    if (r.signed_up_at && r.converted_at) {
      const days = (new Date(r.converted_at) - new Date(r.signed_up_at)) / 86400000
      if (days >= 0) { signupToPaidSum += days; signupToPaidN++ }
    }
  })
  return {
    avgDaysFirstContactToSignup: firstToSignupN ? Math.round(firstToSignupSum / firstToSignupN) : null,
    avgDaysSignupToPaid: signupToPaidN ? Math.round(signupToPaidSum / signupToPaidN) : null,
  }
}

/** Follow-ups completed today (proxied by last_contacted_at). */
export async function getFollowUpProgress() {
  const today = new Date().toISOString().slice(0, 10)
  const { count: completed } = await supabase
    .from('outlook_prospects')
    .select('id', { count: 'exact', head: true })
    .gte('last_contacted_at', today)
  const { count: due } = await supabase
    .from('outlook_prospects')
    .select('id', { count: 'exact', head: true })
    .lte('follow_up_due', today)
    .in('outreach_status', ['contacted', 'responded'])
  return { completed: completed || 0, due: due || 0, target: 10 }
}

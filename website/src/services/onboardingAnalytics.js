import { supabase } from '@/lib/supabase'

export async function trackOnboardingEvent(userId, eventType, stepName = null, stepIndex = null, metadata = {}) {
  try {
    await supabase.from('onboarding_events').insert({
      user_id: userId,
      event_type: eventType,
      step_name: stepName,
      step_index: stepIndex,
      metadata,
    })
  } catch {}
}

export async function getActivationMetrics() {
  const { data } = await supabase
    .from('user_activation_metrics')
    .select('*')
    .order('signed_up_at', { ascending: false })
    .limit(200)
  return data || []
}

export async function getActivationFunnel() {
  const metrics = await getActivationMetrics()
  const total = metrics.length
  if (total === 0) return { total: 0, started: 0, onboarded: 0, activated: 0, rates: {} }

  const started = metrics.filter(m => m.activation_state !== 'new').length
  const onboarded = metrics.filter(m => ['onboarded', 'activated'].includes(m.activation_state)).length
  const activated = metrics.filter(m => m.activation_state === 'activated').length

  return {
    total,
    started,
    onboarded,
    activated,
    rates: {
      startRate: total > 0 ? Math.round((started / total) * 100) : 0,
      onboardRate: total > 0 ? Math.round((onboarded / total) * 100) : 0,
      activationRate: total > 0 ? Math.round((activated / total) * 100) : 0,
    },
    avgHoursToFirstDeal: activated > 0
      ? Math.round(metrics.filter(m => m.activation_state === 'activated').reduce((sum, m) => sum + (m.hours_to_first_deal || 0), 0) / activated)
      : null,
  }
}

export async function getOnboardingDropoff() {
  const { data } = await supabase
    .from('onboarding_events')
    .select('step_name, step_index, event_type')
    .in('event_type', ['step_viewed', 'step_completed', 'step_skipped'])
    .order('step_index')

  if (!data) return []

  const steps = {}
  for (const e of data) {
    const key = e.step_name || `Step ${e.step_index}`
    if (!steps[key]) steps[key] = { name: key, index: e.step_index, viewed: 0, completed: 0, skipped: 0 }
    if (e.event_type === 'step_viewed') steps[key].viewed++
    if (e.event_type === 'step_completed') steps[key].completed++
    if (e.event_type === 'step_skipped') steps[key].skipped++
  }

  return Object.values(steps).sort((a, b) => (a.index || 0) - (b.index || 0))
}

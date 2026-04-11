import { supabase } from '@/lib/supabase'
import { logEvent } from './automationGate'

export async function scanChurnRisks() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, properties!profiles_property_id_fkey(plan, id)')
  if (!profiles) return { flagged: 0 }

  const paidUsers = profiles.filter(p => {
    const plan = p.properties?.plan || 'free'
    return plan === 'starter' || plan === 'pro' || plan === 'enterprise'
  })

  let flagged = 0
  for (const user of paidUsers) {
    const risks = await checkUserChurnRisk(user)
    if (risks.length > 0) {
      for (const risk of risks) {
        await supabase.from('churn_risks').insert({
          user_id: user.id,
          risk_level: risk.level,
          reason: risk.reason,
        })
        flagged++
      }
    }
  }
  await logEvent('operational', 'churn_risk_scan', 'sent', { flagged })
  return { flagged }
}

async function checkUserChurnRisk(user) {
  const risks = []

  // Check last login
  const { data: lastLogin } = await supabase
    .from('login_history')
    .select('login_at')
    .eq('user_id', user.id)
    .order('login_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastLogin) {
    const daysSinceLogin = Math.floor((Date.now() - new Date(lastLogin.login_at).getTime()) / 86400000)
    if (daysSinceLogin >= 21) {
      risks.push({ level: 'high', reason: `No login in ${daysSinceLogin} days` })
    } else if (daysSinceLogin >= 14) {
      risks.push({ level: 'warning', reason: `No login in ${daysSinceLogin} days` })
    }
  }

  // Check deal activity for paid users (30 days)
  const propertyId = user.properties?.id
  if (propertyId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const { count } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .gte('created_at', thirtyDaysAgo)
    if ((count || 0) === 0) {
      risks.push({ level: 'warning', reason: 'No new deals in 30 days' })
    }
  }

  return risks
}

export async function getActiveChurnRisks() {
  const { data } = await supabase
    .from('churn_risks')
    .select('*, profiles(full_name, email)')
    .is('resolved_at', null)
    .order('flagged_at', { ascending: false })
  return data || []
}

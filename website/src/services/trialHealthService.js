import { supabase } from '@/lib/supabase'
import { logEvent } from './automationGate'

// Calculate engagement score for a user on Free plan
export async function calculateEngagementScore(userId) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  // Get login count in last 7 days (from login_history)
  const { count: loginCount } = await supabase
    .from('login_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('login_at', sevenDaysAgo)

  // Get user's property_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('property_id')
    .eq('id', userId)
    .maybeSingle()
  if (!profile?.property_id) return null

  // Count deals and contracts created
  const [deals, contracts] = await Promise.all([
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('property_id', profile.property_id),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('property_id', profile.property_id),
  ])

  const logins = loginCount || 0
  const contractUploads = contracts.count || 0

  let score = 0
  if (logins === 0) score = 0
  else if (logins <= 2) score = 25
  else if (logins <= 5) score = 50
  else score = 75
  if (contractUploads > 0) score += 25
  score = Math.min(100, score)

  let tag = 'ghost'
  if (score >= 75) tag = 'hot'
  else if (score >= 40) tag = 'warm'
  else if (score >= 10) tag = 'cold'

  const featuresUsed = []
  if ((deals.count || 0) > 0) featuresUsed.push('deals')
  if (contractUploads > 0) featuresUsed.push('contracts')

  await supabase.from('user_engagement_scores').upsert({
    user_id: userId,
    score,
    tag,
    login_count_7d: logins,
    features_used: featuresUsed,
    contracts_uploaded: contractUploads,
    calculated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return { score, tag, logins, contractUploads }
}

// Run engagement scoring for all Free plan users
export async function scoreAllFreeUsers() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, properties!profiles_property_id_fkey(plan)')
  if (!profiles) return { scored: 0 }

  const freeProfiles = profiles.filter(p => (p.properties?.plan || 'free') === 'free')
  let scored = 0
  for (const p of freeProfiles) {
    try {
      await calculateEngagementScore(p.id)
      scored++
    } catch {}
  }
  await logEvent('operational', 'trial_health_check', 'sent', { scored })
  return { scored }
}

export async function getUsersByTag(tag) {
  const { data } = await supabase
    .from('user_engagement_scores')
    .select('*, profiles(id, full_name, email, created_at)')
    .eq('tag', tag)
    .order('calculated_at', { ascending: false })
  return data || []
}

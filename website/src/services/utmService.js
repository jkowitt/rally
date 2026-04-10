import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'll-utm-params'

// Capture UTM params from URL on page load — first-touch only
export function captureUtmParams() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const utm = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
  }
  if (!utm.utm_source) return null

  // First-touch: only save if not already stored
  const existing = localStorage.getItem(STORAGE_KEY)
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...utm, captured_at: new Date().toISOString() }))
  }
  return utm
}

export function getStoredUtm() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Attach UTM data to a user's profile on signup
export async function attachUtmToUser(userId) {
  const utm = getStoredUtm()
  if (!utm || !userId) return
  await supabase.from('profiles').update({
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
  }).eq('id', userId)
}

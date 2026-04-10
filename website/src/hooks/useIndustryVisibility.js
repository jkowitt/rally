import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Default: all industries visible
const DEFAULTS = {
  sports: true,
  entertainment: true,
  conference: true,
  nonprofit: true,
  media: true,
  realestate: true,
  agency: true,
  other: true,
}

// Reads industry visibility flags from feature_flags table without requiring auth.
// Safe to use on public pages (landing, signup).
export function useIndustryVisibility() {
  const [visibility, setVisibility] = useState(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('module, enabled')
          .like('module', 'show_%')
        if (cancelled) return
        if (error || !data) {
          setVisibility(DEFAULTS)
        } else {
          const map = { ...DEFAULTS }
          data.forEach(f => {
            const key = f.module.replace('show_', '')
            if (key in map) map[key] = f.enabled
          })
          setVisibility(map)
        }
      } catch {
        setVisibility(DEFAULTS)
      }
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { visibility, loaded }
}

// Check if a specific industry should be shown
export function shouldShowIndustry(visibility, industryId) {
  // Map landing page IDs to visibility keys
  const aliasMap = {
    sports: 'sports',
    college: 'sports',
    professional: 'sports',
    minor_league: 'sports',
    entertainment: 'entertainment',
    conference: 'conference',
    nonprofit: 'nonprofit',
    media: 'media',
    realestate: 'realestate',
    agency: 'agency',
    other: 'other',
  }
  const key = aliasMap[industryId] || industryId
  return visibility[key] !== false
}

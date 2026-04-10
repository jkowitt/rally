import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const FeatureFlagContext = createContext({})

const ALL_MODULES = [
  'crm', 'sportify', 'valora', 'businessnow',
  'newsletter', 'automations', 'businessops', 'developer', 'marketing',
  'industry_nonprofit', 'industry_media', 'industry_realestate',
  'industry_entertainment', 'industry_conference', 'industry_agency',
]

const ALL_ON = Object.fromEntries(ALL_MODULES.map(m => [m, true]))
const ALL_OFF = Object.fromEntries(ALL_MODULES.map(m => [m, false]))

export function FeatureFlagProvider({ children }) {
  const { session, profile } = useAuth()
  const isDev = profile?.role === 'developer'
  const [flags, setFlags] = useState(ALL_OFF)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) return
    if (isDev) {
      setFlags(ALL_ON)
      setLoaded(true)
      return
    }
    loadFlags()
  }, [session, isDev])

  async function loadFlags() {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('module, enabled')
      if (error || !data) {
        setFlags({ ...ALL_OFF, crm: true })
      } else {
        const flagMap = { ...ALL_OFF, crm: true }
        data.forEach((f) => { flagMap[f.module] = f.enabled })
        setFlags(flagMap)
      }
    } catch {
      setFlags({ ...ALL_OFF, crm: true })
    }
    setLoaded(true)
  }

  async function toggleFlag(module) {
    const newValue = !flags[module]
    // Optimistically update UI
    setFlags((prev) => ({ ...prev, [module]: newValue }))

    // Try update first, if no rows affected then insert
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({ enabled: newValue, updated_at: new Date().toISOString() })
        .eq('module', module)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        // Row doesn't exist — insert it
        const { error: insErr } = await supabase.from('feature_flags').insert({
          module, enabled: newValue, updated_at: new Date().toISOString(),
        })
        if (insErr) throw insErr
      }
      return { success: true, module, enabled: newValue }
    } catch (err) {
      // Try upsert as last resort
      try {
        const { error: upsertErr } = await supabase.from('feature_flags').upsert({
          module, enabled: newValue, updated_at: new Date().toISOString(),
        }, { onConflict: 'module' })
        if (upsertErr) throw upsertErr
        return { success: true, module, enabled: newValue }
      } catch (finalErr) {
        // Revert optimistic update on failure
        setFlags((prev) => ({ ...prev, [module]: !newValue }))
        return { success: false, module, error: finalErr.message }
      }
    }
  }

  return (
    <FeatureFlagContext.Provider value={{ flags, loaded, toggleFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext)
}

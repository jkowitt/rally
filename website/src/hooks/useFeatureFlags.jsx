import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const FeatureFlagContext = createContext({})

const ALL_ON = { crm: true, sportify: true, valora: true, businessnow: true }
const ALL_OFF = { crm: false, sportify: false, valora: false, businessnow: false }

export function FeatureFlagProvider({ children }) {
  const { session, profile } = useAuth()
  const isDev = profile?.role === 'developer'
  const [flags, setFlags] = useState(ALL_OFF)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) return
    // Developer always sees everything
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
        // Table missing or RLS blocked — default CRM on
        setFlags({ ...ALL_OFF, crm: true })
      } else {
        const flagMap = { ...ALL_OFF, crm: true } // CRM always on as baseline
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
    try {
      await supabase
        .from('feature_flags')
        .update({ enabled: newValue, updated_at: new Date().toISOString() })
        .eq('module', module)
    } catch { /* table may not exist */ }
    setFlags((prev) => ({ ...prev, [module]: newValue }))
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

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const FeatureFlagContext = createContext({})

export function FeatureFlagProvider({ children }) {
  const { session } = useAuth()
  const [flags, setFlags] = useState({
    crm: false,
    sportify: false,
    valora: false,
    businessnow: false,
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session) return
    loadFlags()
  }, [session])

  async function loadFlags() {
    const { data } = await supabase
      .from('feature_flags')
      .select('module, enabled')
    if (data) {
      const flagMap = {}
      data.forEach((f) => { flagMap[f.module] = f.enabled })
      setFlags(flagMap)
    }
    setLoaded(true)
  }

  async function toggleFlag(module) {
    const newValue = !flags[module]
    await supabase
      .from('feature_flags')
      .update({ enabled: newValue, updated_at: new Date().toISOString() })
      .eq('module', module)
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

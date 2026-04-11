import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const FeatureFlagContext = createContext({})

const ALL_MODULES = [
  'crm', 'sportify', 'valora', 'businessnow',
  'newsletter', 'automations', 'businessops', 'developer', 'marketing',
  'industry_nonprofit', 'industry_media', 'industry_realestate',
  'industry_entertainment', 'industry_conference', 'industry_agency',
  // Industry visibility in signup + welcome selectors
  'show_sports', 'show_entertainment', 'show_conference',
  'show_nonprofit', 'show_media', 'show_realestate', 'show_agency', 'show_other',
  // Client-facing Growth Tools (all default OFF — greenlit by developer)
  'client_growth_hub',          // master toggle for the /app/growth page
  'client_marketing_hub',       // Phase 1
  'client_ad_spend',            // Phase 1
  'client_goal_tracker',        // Phase 1
  'client_connection_manager',  // Phase 1
  'client_financial_projections', // Phase 2
  'client_finance_dashboard',   // Phase 2
  'client_growth_workbook',     // Phase 2 (new)
  'client_report_builder',      // Phase 3
  'client_strategic_workbooks', // Phase 3 (new)
]

const ALL_ON = Object.fromEntries(ALL_MODULES.map(m => [m, true]))
const ALL_OFF = Object.fromEntries(ALL_MODULES.map(m => [m, false]))
// Defaults when the DB doesn't have a row for the flag — CRM and all industry visibility ON
const DEFAULT_FLAGS = {
  ...ALL_OFF,
  crm: true,
  show_sports: true, show_entertainment: true, show_conference: true,
  show_nonprofit: true, show_media: true, show_realestate: true,
  show_agency: true, show_other: true,
}

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

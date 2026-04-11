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

// Hidden modules: flags that must NEVER appear in the standard Dev Tools
// feature flags UI and must NOT be auto-enabled by the developer role.
// These always respect their DB value, even for developers, and are
// toggleable only from the private /dev/feature-flags console.
// Used by the Dev Tools UI to exclude these from rendering.
export const HIDDEN_MODULES = [
  'outlook_integration',        // developer-only Outlook integration
]

const ALL_PUBLIC_MODULES = [...ALL_MODULES, ...HIDDEN_MODULES]

// ALL_ON is the developer override: everything visible on. Hidden modules
// are intentionally excluded so developers still have to toggle them on
// manually from the hidden dev console.
const ALL_ON = Object.fromEntries(ALL_MODULES.map(m => [m, true]))
const ALL_OFF = Object.fromEntries(ALL_PUBLIC_MODULES.map(m => [m, false]))
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
    loadFlags()
  }, [session, isDev])

  async function loadFlags() {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('module, enabled')
      // Developer baseline: all standard flags ON, hidden flags OFF.
      // Client baseline: DEFAULT_FLAGS.
      const baseline = isDev ? { ...ALL_ON } : { ...DEFAULT_FLAGS }
      // Hidden modules always start OFF, even for developers — they must
      // be explicitly toggled on from the private /dev/feature-flags page.
      HIDDEN_MODULES.forEach((m) => { baseline[m] = false })
      if (error || !data) {
        setFlags(baseline)
      } else {
        const flagMap = { ...baseline }
        // For developers: only hidden flags read from DB (everything else is already ON).
        // For clients: all flags read from DB.
        data.forEach((f) => {
          if (!isDev || HIDDEN_MODULES.includes(f.module)) {
            flagMap[f.module] = f.enabled
          }
        })
        setFlags(flagMap)
      }
    } catch {
      const baseline = isDev ? { ...ALL_ON } : { ...DEFAULT_FLAGS }
      HIDDEN_MODULES.forEach((m) => { baseline[m] = false })
      setFlags(baseline)
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

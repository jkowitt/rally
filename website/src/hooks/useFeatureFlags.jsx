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
  'email_marketing_developer',  // developer-only email marketing
  'email_marketing_public',     // admin+ email marketing (requires dev flag on too)
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
      // The baseline is ONLY used for flags that have no row in the
      // DB (e.g. a brand-new flag that hasn't been seeded yet). Any
      // flag that DOES have a row is read from the DB regardless of
      // role, so toggles in Dev Tools persist across reloads.
      const baseline = isDev ? { ...ALL_ON } : { ...DEFAULT_FLAGS }
      // Hidden modules start OFF in the baseline. DB values still
      // override if a row exists.
      HIDDEN_MODULES.forEach((m) => { baseline[m] = false })
      if (error || !data) {
        setFlags(baseline)
      } else {
        const flagMap = { ...baseline }
        // Overlay DB values for ALL flags regardless of role. This
        // is the critical fix: previously developers only read
        // hidden flags from the DB, which meant standard flag
        // toggles appeared to save but silently reverted on reload
        // because ALL_ON overwrote them.
        data.forEach((f) => { flagMap[f.module] = f.enabled })
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

      if (error) {
        console.error('[useFeatureFlags] UPDATE failed for', module, error)
        throw error
      }

      if (!data || data.length === 0) {
        // Row doesn't exist — insert it
        console.info('[useFeatureFlags] No existing row for', module, '- attempting INSERT')
        const { error: insErr } = await supabase.from('feature_flags').insert({
          module, enabled: newValue, updated_at: new Date().toISOString(),
        })
        if (insErr) {
          console.error('[useFeatureFlags] INSERT failed for', module, insErr)
          // Hint the developer at the most likely root causes so they
          // can apply the fix instead of staring at a silent revert.
          if (insErr.message?.includes('row-level security') || insErr.code === '42501') {
            console.error('[useFeatureFlags] → RLS blocked the insert. Apply migration 058 (supabase db push) to add the flags_insert policy.')
          }
          if (insErr.message?.includes('check constraint') || insErr.code === '23514') {
            console.error('[useFeatureFlags] → CHECK constraint blocked the insert. Apply migration 058 to drop feature_flags_module_check.')
          }
          throw insErr
        }
      }
      console.info('[useFeatureFlags] Saved', module, '=', newValue)
      return { success: true, module, enabled: newValue }
    } catch (err) {
      // Try upsert as last resort
      try {
        const { error: upsertErr } = await supabase.from('feature_flags').upsert({
          module, enabled: newValue, updated_at: new Date().toISOString(),
        }, { onConflict: 'module' })
        if (upsertErr) {
          console.error('[useFeatureFlags] UPSERT fallback failed for', module, upsertErr)
          throw upsertErr
        }
        console.info('[useFeatureFlags] Saved via upsert fallback', module, '=', newValue)
        return { success: true, module, enabled: newValue }
      } catch (finalErr) {
        // Revert optimistic update on failure
        console.error('[useFeatureFlags] All save attempts failed for', module, '- reverting UI')
        setFlags((prev) => ({ ...prev, [module]: !newValue }))
        return { success: false, module, error: finalErr.message || 'Unknown error' }
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

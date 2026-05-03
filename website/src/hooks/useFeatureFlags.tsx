import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useImpersonation } from './useImpersonation'

export type FlagMap = Record<string, boolean>

export interface ToggleFlagResult {
  success: boolean
  module: string
  enabled?: boolean
  error?: string
}

export interface FeatureFlagContextValue {
  flags: FlagMap
  rawFlags: FlagMap
  loaded: boolean
  toggleFlag: (module: string) => Promise<ToggleFlagResult>
}

const ALL_MODULES: readonly string[] = [
  'crm', 'sportify', 'valora', 'businessnow',
  'newsletter', 'automations', 'businessops', 'developer', 'marketing',
  'industry_nonprofit', 'industry_media', 'industry_realestate',
  'industry_entertainment', 'industry_conference', 'industry_agency',
  // Industry visibility in signup + welcome selectors
  'show_sports', 'show_entertainment', 'show_conference',
  'show_nonprofit', 'show_media', 'show_realestate', 'show_agency', 'show_other',
  // Client-facing Growth Tools (all default OFF — greenlit by developer)
  'client_growth_hub',
  'client_marketing_hub',
  'client_ad_spend',
  'client_goal_tracker',
  'client_connection_manager',
  'client_financial_projections',
  'client_finance_dashboard',
  'client_growth_workbook',
  'client_report_builder',
  'client_strategic_workbooks',
  // Inbox integrations (greenlit per provider once OAuth apps are registered)
  'inbox_outlook',
  'inbox_gmail',
]

// Hidden modules: flags that must NEVER appear in the standard Dev Tools
// feature flags UI and must NOT be auto-enabled by the developer role.
// These always respect their DB value, even for developers, and are
// toggleable only from the private /dev/feature-flags console.
export const HIDDEN_MODULES: readonly string[] = [
  'outlook_integration',
  'email_marketing_developer',
  'email_marketing_public',
]

const ALL_PUBLIC_MODULES = [...ALL_MODULES, ...HIDDEN_MODULES]

const ALL_ON: FlagMap = Object.fromEntries(ALL_MODULES.map(m => [m, true]))
const ALL_OFF: FlagMap = Object.fromEntries(ALL_PUBLIC_MODULES.map(m => [m, false]))
const DEFAULT_FLAGS: FlagMap = {
  ...ALL_OFF,
  crm: true,
  show_sports: true, show_entertainment: true, show_conference: true,
  show_nonprofit: true, show_media: true, show_realestate: true,
  show_agency: true, show_other: true,
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: ALL_OFF,
  rawFlags: ALL_OFF,
  loaded: false,
  toggleFlag: async (m) => ({ success: false, module: m, error: 'Provider not mounted' }),
})

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { session, realIsDeveloper } = useAuth()
  const isDev = realIsDeveloper
  const impersonation = useImpersonation()
  const [flags, setFlags] = useState<FlagMap>(ALL_OFF)
  const [loaded, setLoaded] = useState<boolean>(false)

  useEffect(() => {
    if (!session) return
    loadFlags()
  }, [session, isDev])

  async function loadFlags(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('module, enabled')
      const baseline: FlagMap = isDev ? { ...ALL_ON } : { ...DEFAULT_FLAGS }
      HIDDEN_MODULES.forEach((m) => { baseline[m] = false })
      if (error || !data) {
        setFlags(baseline)
      } else {
        const flagMap: FlagMap = { ...baseline }
        for (const f of data as Array<{ module: string; enabled: boolean }>) {
          flagMap[f.module] = f.enabled
        }
        setFlags(flagMap)
      }
    } catch {
      const baseline: FlagMap = isDev ? { ...ALL_ON } : { ...DEFAULT_FLAGS }
      HIDDEN_MODULES.forEach((m) => { baseline[m] = false })
      setFlags(baseline)
    }
    setLoaded(true)
  }

  async function toggleFlag(module: string): Promise<ToggleFlagResult> {
    const newValue = !flags[module]
    // Optimistically update UI
    setFlags((prev) => ({ ...prev, [module]: newValue }))

    // ─── Primary path: edge function with service role ────────
    try {
      const { data: efData, error: efErr } = await supabase.functions.invoke('set-feature-flag', {
        body: { module, enabled: newValue },
      })

      if (!efErr && efData?.success) {
        console.info('[useFeatureFlags] Saved via edge function:', module, '=', newValue)
        return { success: true, module, enabled: newValue }
      }

      if (!efErr && efData && efData.success === false) {
        console.error('[useFeatureFlags] Edge function rejected write:', efData)
        if (efData.hint) console.error('[useFeatureFlags] →', efData.hint)
      }

      if (efErr) {
        console.warn('[useFeatureFlags] Edge function unreachable, falling back to direct DB:', efErr.message)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[useFeatureFlags] Edge function threw, falling back to direct DB:', msg)
    }

    // ─── Fallback: direct DB writes ─────────────────────────
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({ enabled: newValue, updated_at: new Date().toISOString() })
        .eq('module', module)
        .select()

      if (error) {
        console.error('[useFeatureFlags] Fallback UPDATE failed for', module, error)
        throw error
      }

      if (!data || data.length === 0) {
        console.info('[useFeatureFlags] No existing row for', module, '- attempting INSERT')
        const { error: insErr } = await supabase.from('feature_flags').insert({
          module, enabled: newValue, updated_at: new Date().toISOString(),
        })
        if (insErr) {
          console.error('[useFeatureFlags] Fallback INSERT failed for', module, insErr)
          if (insErr.message?.includes('row-level security') || insErr.code === '42501') {
            console.error('[useFeatureFlags] → RLS blocked insert. Deploy set-feature-flag edge function or run migration 058.')
          }
          if (insErr.message?.includes('check constraint') || insErr.code === '23514') {
            console.error('[useFeatureFlags] → CHECK constraint blocked insert. Deploy set-feature-flag edge function or run migration 058.')
          }
          throw insErr
        }
      }
      console.info('[useFeatureFlags] Saved via direct DB fallback:', module, '=', newValue)
      return { success: true, module, enabled: newValue }
    } catch (finalErr) {
      console.error('[useFeatureFlags] All save attempts failed for', module, '- reverting UI')
      setFlags((prev) => ({ ...prev, [module]: !newValue }))
      const msg = finalErr instanceof Error
        ? finalErr.message
        : 'Could not save. Deploy set-feature-flag edge function or apply migration 058.'
      return { success: false, module, error: msg }
    }
  }

  // Overlay tier preset flags when developer is impersonating a tier
  const effectiveFlags: FlagMap = (isDev && impersonation.tierFlags)
    ? { ...flags, ...impersonation.tierFlags }
    : flags

  const value: FeatureFlagContextValue = {
    flags: effectiveFlags,
    rawFlags: flags,
    loaded,
    toggleFlag,
  }

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export function useFeatureFlags(): FeatureFlagContextValue {
  return useContext(FeatureFlagContext)
}

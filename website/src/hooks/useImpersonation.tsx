import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Role, PropertyType } from '@/types/db'

// Visual impersonation for developers. Lets the dev preview the app
// as a client with a different industry, role, and account tier.
//
// IMPORTANT: this is preview-only. Database writes still happen
// through the developer's authenticated session — Supabase RLS
// would not respect a fake JWT. To act as another user for
// real, sign in as them or build a server-side impersonation
// edge function. The banner across the top makes this state
// impossible to forget.

const STORAGE_KEY = 'll_impersonation'
const CHANGE_EVENT = 'll-impersonation-change'

export type TierId = 'free' | 'pro' | 'enterprise'

export type TierFlags = Record<string, boolean>

export interface TierPreset {
  label: string
  flags: TierFlags
}

const TIER_PRESETS: Record<TierId, TierPreset> = {
  free: {
    label: 'Free',
    flags: {
      crm: true,
      client_growth_hub: false,
      client_finance_dashboard: false,
      client_marketing_hub: false,
      client_ad_spend: false,
      client_goal_tracker: false,
      client_connection_manager: false,
      client_financial_projections: false,
      client_growth_workbook: false,
      client_report_builder: false,
      client_strategic_workbooks: false,
      email_marketing_public: false,
    },
  },
  pro: {
    label: 'Pro',
    flags: {
      crm: true,
      client_growth_hub: true,
      client_marketing_hub: true,
      client_goal_tracker: true,
      client_connection_manager: true,
      client_ad_spend: true,
      email_marketing_public: false,
    },
  },
  enterprise: {
    label: 'Enterprise',
    flags: {
      crm: true,
      client_growth_hub: true,
      client_marketing_hub: true,
      client_ad_spend: true,
      client_goal_tracker: true,
      client_connection_manager: true,
      client_financial_projections: true,
      client_finance_dashboard: true,
      client_growth_workbook: true,
      client_report_builder: true,
      client_strategic_workbooks: true,
      email_marketing_public: true,
    },
  },
}

export interface ImpersonationState {
  industry: PropertyType | null
  role: Role | null
  tier: TierId | null
}

export interface ImpersonationAPI extends ImpersonationState {
  isActive: boolean
  tierFlags: TierFlags | null
  tierPresets: Record<TierId, TierPreset>
  setIndustry: (v: PropertyType | null) => void
  setRole: (v: Role | null) => void
  setTier: (v: TierId | null) => void
  reset: () => void
}

const EMPTY_STATE: ImpersonationState = { industry: null, role: null, tier: null }

const ImpersonationContext = createContext<ImpersonationAPI | null>(null)

function read(): ImpersonationState {
  if (typeof window === 'undefined') return { ...EMPTY_STATE }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_STATE }
    const parsed = JSON.parse(raw) as Partial<ImpersonationState>
    return {
      industry: parsed.industry ?? null,
      role: parsed.role ?? null,
      tier: parsed.tier ?? null,
    }
  } catch {
    return { ...EMPTY_STATE }
  }
}

function write(state: ImpersonationState): void {
  if (typeof window === 'undefined') return
  if (!state.industry && !state.role && !state.tier) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }))
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(read)

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<ImpersonationState>).detail
      if (detail) setState(detail)
    }
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CHANGE_EVENT, onChange)
  }, [])

  const setIndustry = useCallback((industry: PropertyType | null) => {
    const next = { ...state, industry: industry || null }
    setState(next)
    write(next)
  }, [state])

  const setRole = useCallback((role: Role | null) => {
    const next = { ...state, role: role || null }
    setState(next)
    write(next)
  }, [state])

  const setTier = useCallback((tier: TierId | null) => {
    const next = { ...state, tier: tier || null }
    setState(next)
    write(next)
  }, [state])

  const reset = useCallback(() => {
    setState({ ...EMPTY_STATE })
    write({ ...EMPTY_STATE })
  }, [])

  const isActive = !!(state.industry || state.role || state.tier)
  const tierFlags = state.tier ? TIER_PRESETS[state.tier].flags : null

  const value: ImpersonationAPI = {
    ...state,
    isActive,
    tierFlags,
    tierPresets: TIER_PRESETS,
    setIndustry,
    setRole,
    setTier,
    reset,
  }

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation(): ImpersonationAPI {
  const ctx = useContext(ImpersonationContext)
  if (!ctx) {
    return {
      industry: null, role: null, tier: null,
      isActive: false, tierFlags: null, tierPresets: TIER_PRESETS,
      setIndustry: () => {}, setRole: () => {}, setTier: () => {}, reset: () => {},
    }
  }
  return ctx
}

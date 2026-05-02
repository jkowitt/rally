import { createContext, useCallback, useContext, useEffect, useState } from 'react'

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

const ImpersonationContext = createContext(null)

const TIER_PRESETS = {
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

const EMPTY_STATE = { industry: null, role: null, tier: null }

function read() {
  if (typeof window === 'undefined') return { ...EMPTY_STATE }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_STATE }
    const parsed = JSON.parse(raw)
    return {
      industry: parsed.industry || null,
      role: parsed.role || null,
      tier: parsed.tier || null,
    }
  } catch {
    return { ...EMPTY_STATE }
  }
}

function write(state) {
  if (typeof window === 'undefined') return
  if (!state.industry && !state.role && !state.tier) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }))
}

export function ImpersonationProvider({ children }) {
  const [state, setState] = useState(read)

  useEffect(() => {
    function onChange(e) {
      if (e.detail) setState(e.detail)
    }
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CHANGE_EVENT, onChange)
  }, [])

  const setIndustry = useCallback((industry) => {
    const next = { ...state, industry: industry || null }
    setState(next)
    write(next)
  }, [state])

  const setRole = useCallback((role) => {
    const next = { ...state, role: role || null }
    setState(next)
    write(next)
  }, [state])

  const setTier = useCallback((tier) => {
    const next = { ...state, tier: tier || null }
    setState(next)
    write(next)
  }, [state])

  const reset = useCallback(() => {
    setState({ ...EMPTY_STATE })
    write({ ...EMPTY_STATE })
  }, [])

  const isActive = !!(state.industry || state.role || state.tier)
  const tierFlags = state.tier && TIER_PRESETS[state.tier] ? TIER_PRESETS[state.tier].flags : null

  return (
    <ImpersonationContext.Provider value={{
      ...state,
      isActive,
      tierFlags,
      tierPresets: TIER_PRESETS,
      setIndustry,
      setRole,
      setTier,
      reset,
    }}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
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

export { TIER_PRESETS }

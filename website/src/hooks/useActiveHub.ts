import { useEffect, useState } from 'react'

const STORAGE_KEY = 'll_active_hub'
const CHANGE_EVENT = 'll-active-hub-change'

export type HubId = 'prospect' | 'crm' | 'accounts' | 'ops'
export type HubAccent = 'sky' | 'violet' | 'emerald' | 'amber'

export interface Hub {
  id: HubId
  label: string
  icon: string
  accent: HubAccent
}

// `accent` is a Tailwind color stem we use to theme each hub's
// active-state pill in the TopBar. Keep these to colors that are
// clearly distinguishable for color-vision-deficient users.
export const HUBS: readonly Hub[] = [
  { id: 'prospect', label: 'Prospecting',           icon: '🎯', accent: 'violet' },
  { id: 'crm',      label: 'CRM',                   icon: '📊', accent: 'sky' },
  { id: 'accounts', label: 'Account Management',    icon: '🤝', accent: 'emerald' },
  { id: 'ops',      label: 'Business Operations',   icon: '⚙',  accent: 'amber' },
]

// PROSPECT_PATHS lists URL prefixes that belong to the Prospecting
// hub. Order matters — anything not matched here falls through to
// the existing CRM detection so deep links to /app/crm/pipeline
// still land in CRM (not Prospecting).
const PROSPECT_PATHS = [
  '/app/crm/signals',
  '/app/crm/lookalikes',
  '/app/crm/priority',
  '/app/crm/sequences',
  '/app/crm/outreach-analytics',
  '/app/crm/relationships',
  '/app/crm/inbox',
  '/app/prospect',
]

export function detectHub(pathname: string | null | undefined): HubId {
  if (!pathname) return 'crm'
  if (pathname.startsWith('/app/accounts')) return 'accounts'
  if (pathname.startsWith('/app/crm/contracts')) return 'accounts'
  if (pathname.startsWith('/app/crm/fulfillment')) return 'accounts'
  if (pathname.startsWith('/app/marketing')) return 'ops'
  if (pathname.startsWith('/app/ops')) return 'ops'
  if (pathname.startsWith('/app/admin')) return 'ops'
  if (pathname.startsWith('/app/businessops')) return 'ops'
  if (pathname.startsWith('/app/developer')) return 'ops'
  if (pathname.startsWith('/app/settings')) return 'ops'
  if (pathname.startsWith('/app/growth')) return 'ops'
  // Backwards-compat: old /crm/* paths that have been moved to /ops/*
  if (pathname.startsWith('/app/crm/team')) return 'ops'
  if (pathname.startsWith('/app/crm/newsletter')) return 'ops'
  if (pathname.startsWith('/app/crm/automations')) return 'ops'
  if (pathname.startsWith('/app/crm/projects')) return 'ops'
  // Prospecting routes (subset of /app/crm/*) split out into their own hub.
  if (PROSPECT_PATHS.some(p => pathname.startsWith(p))) return 'prospect'
  return 'crm'
}

function isHubId(v: unknown): v is HubId {
  return typeof v === 'string' && HUBS.some(h => h.id === v)
}

function readInitial(): HubId {
  if (typeof window === 'undefined') return 'crm'
  const detected = detectHub(window.location.pathname)
  // URL always wins over saved value to avoid mismatch on direct nav
  if (detected) return detected
  const saved = localStorage.getItem(STORAGE_KEY)
  if (isHubId(saved)) return saved
  return 'crm'
}

export interface ActiveHubAPI {
  activeHub: HubId
  setActiveHub: (hubId: HubId) => void
}

export function useActiveHub(): ActiveHubAPI {
  const [activeHub, setActiveHubState] = useState<HubId>(readInitial)

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<unknown>).detail
      if (isHubId(detail)) setActiveHubState(detail)
    }
    window.addEventListener(CHANGE_EVENT, handler)
    return () => window.removeEventListener(CHANGE_EVENT, handler)
  }, [])

  function setActiveHub(hubId: HubId) {
    if (!isHubId(hubId)) return
    localStorage.setItem(STORAGE_KEY, hubId)
    setActiveHubState(hubId)
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: hubId }))
  }

  return { activeHub, setActiveHub }
}

export function getHubLandingPath(hubId: HubId): string {
  if (hubId === 'accounts') return '/app/accounts'
  if (hubId === 'ops') return '/app/ops'
  if (hubId === 'prospect') return '/app/crm/priority'
  return '/app'
}

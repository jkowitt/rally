import { useEffect, useState } from 'react'

const STORAGE_KEY = 'll_active_hub'
const CHANGE_EVENT = 'll-active-hub-change'

export const HUBS = [
  { id: 'crm', label: 'CRM & Prospecting', icon: '📊' },
  { id: 'accounts', label: 'Account Management', icon: '🤝' },
  { id: 'ops', label: 'Business Operations', icon: '⚙' },
]

export function detectHub(pathname) {
  if (!pathname) return 'crm'
  if (pathname.startsWith('/app/accounts')) return 'accounts'
  if (pathname.startsWith('/app/crm/contracts')) return 'accounts'
  if (pathname.startsWith('/app/crm/fulfillment')) return 'accounts'
  if (pathname.startsWith('/app/crm/projects')) return 'ops'
  if (pathname.startsWith('/app/marketing')) return 'ops'
  if (pathname.startsWith('/app/ops')) return 'ops'
  if (pathname.startsWith('/app/admin')) return 'ops'
  if (pathname.startsWith('/app/businessops')) return 'ops'
  if (pathname.startsWith('/app/developer')) return 'ops'
  if (pathname.startsWith('/app/settings')) return 'ops'
  if (pathname.startsWith('/app/growth')) return 'ops'
  if (pathname.startsWith('/app/crm/team')) return 'ops'
  if (pathname.startsWith('/app/crm/newsletter')) return 'ops'
  if (pathname.startsWith('/app/crm/automations')) return 'ops'
  return 'crm'
}

function readInitial() {
  if (typeof window === 'undefined') return 'crm'
  const detected = detectHub(window.location.pathname)
  // URL always wins over saved value to avoid mismatch on direct nav
  if (detected) return detected
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && HUBS.some(h => h.id === saved)) return saved
  return 'crm'
}

export function useActiveHub() {
  const [activeHub, setActiveHubState] = useState(readInitial)

  useEffect(() => {
    function handler(e) {
      if (e.detail && HUBS.some(h => h.id === e.detail)) {
        setActiveHubState(e.detail)
      }
    }
    window.addEventListener(CHANGE_EVENT, handler)
    return () => window.removeEventListener(CHANGE_EVENT, handler)
  }, [])

  function setActiveHub(hubId) {
    if (!HUBS.some(h => h.id === hubId)) return
    localStorage.setItem(STORAGE_KEY, hubId)
    setActiveHubState(hubId)
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: hubId }))
  }

  return { activeHub, setActiveHub }
}

export function getHubLandingPath(hubId) {
  if (hubId === 'accounts') return '/app/accounts'
  if (hubId === 'ops') return '/app/ops'
  return '/app'
}

import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { Search, Menu, X, Bug } from 'lucide-react'
import NotificationCenter from '../NotificationCenter'
import AutomationStatusBadge from '../automation/AutomationStatusBadge'
import { APIUsageCompact } from './../../components/APIUsageBanner'
import ImpersonationPanel from '../ImpersonationPanel'
import UserMenu from './UserMenu'
import { useActiveHub, HUBS, getHubLandingPath } from '@/hooks/useActiveHub'
import { LayoutGrid, Handshake, Settings as SettingsIcon, Target } from 'lucide-react'
import { emit } from '@/lib/appEvents'

// Map hub id → lucide icon. Keeps HUBS data shape free of JSX so it
// can stay typed and reused everywhere.
const HUB_ICONS = {
  prospect: Target,
  crm: LayoutGrid,
  accounts: Handshake,
  ops: SettingsIcon,
}

export default function TopBar({ onMenuToggle, mobileMenuOpen }) {
  const { profile, realIsDeveloper, isDeveloper, signOut } = useAuth()
  const { flags } = useFeatureFlags()
  const navigate = useNavigate()
  const { activeHub, setActiveHub } = useActiveHub()

  const role = profile?.role
  const hasAdminRole = role === 'developer' || role === 'businessops' || role === 'admin'
  const showEmailMarketing =
    (isDeveloper && flags.email_marketing_developer) ||
    (hasAdminRole && flags.email_marketing_public)

  const visibleHubs = HUBS.filter(hub => {
    if (hub.id === 'crm') return true
    if (hub.id === 'prospect') return true
    if (hub.id === 'accounts') {
      // Account Management is gated by hub_accounts (default ON).
      // Developers always see it so they can flip the toggle.
      return isDeveloper || flags.hub_accounts !== false
    }
    if (hub.id === 'ops') {
      // Business Operations is gated by hub_business_ops (default
      // OFF for non-developers). The legacy admin / marketing /
      // finance entry points still grant access for backward compat.
      if (isDeveloper) return true
      if (flags.hub_business_ops) return hasAdminRole || showEmailMarketing || flags.client_growth_hub || flags.client_finance_dashboard
      return false
    }
    return false
  })

  function openSearch() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }

  function switchHub(hubId) {
    // Clicking the hub you're already on shouldn't reset you to the
    // landing page — that would lose the user's place inside the hub.
    if (hubId === activeHub) return
    setActiveHub(hubId)
    navigate(getHubLandingPath(hubId))
  }

  function activeHubClass(accent) {
    // Tailwind needs literal class names — can't compose them at runtime.
    if (accent === 'emerald') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-sm'
    if (accent === 'amber')   return 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-sm'
    if (accent === 'violet')  return 'bg-violet-500/15 text-violet-300 border-violet-500/50 shadow-sm'
    return 'bg-sky-500/15 text-sky-300 border-sky-500/50 shadow-sm'
  }

  function hubDotClass(accent) {
    if (accent === 'emerald') return 'bg-emerald-400'
    if (accent === 'amber')   return 'bg-amber-400'
    if (accent === 'violet')  return 'bg-violet-400'
    return 'bg-sky-400'
  }

  return (
    <header className="border-b border-border bg-bg-surface">
      <div className="h-14 flex items-center justify-between px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="md:hidden text-text-muted hover:text-text-primary p-1 -ml-1"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => navigate('/app')}
            className="md:hidden cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Loud Legacy — Home"
          >
            <img
              src="/logo-loud-legacy.svg"
              alt="Loud Legacy"
              className="h-5 w-auto"
            />
          </button>

          {profile?.properties?.name && (
            <span className="hidden md:inline text-sm text-text-primary font-medium">
              {profile.properties.name}
            </span>
          )}
          {profile?.properties?.sport && (
            <span className="hidden md:inline text-xs text-text-muted font-mono bg-bg-card px-2 py-0.5 rounded">
              {profile.properties.sport}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={openSearch}
            className="hidden sm:flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary hover:border-accent/30 transition-colors"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Search...</span>
            <kbd className="text-[10px] font-mono bg-bg-surface px-1.5 py-0.5 rounded border border-border">Ctrl+K</kbd>
          </button>
          <button
            onClick={openSearch}
            className="sm:hidden text-text-muted hover:text-text-primary p-1"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="hidden lg:block">
            <APIUsageCompact />
          </div>
          {realIsDeveloper && <ImpersonationPanel />}
          {(profile?.role === 'developer' || profile?.role === 'businessops' || profile?.role === 'admin') && (
            <AutomationStatusBadge />
          )}
          <button
            onClick={() => emit('open-issue')}
            title="Report an issue"
            aria-label="Report an issue"
            className="text-text-muted hover:text-accent p-1.5 rounded transition-colors"
          >
            <Bug className="w-5 h-5" aria-hidden="true" />
          </button>
          <NotificationCenter />
          <UserMenu />
        </div>
      </div>

      {/* Hub-switcher strip suppressed for launch. Prospecting now
          lives as a section inside the CRM sidebar; the Accounts
          and Ops hubs are flag-gated and reach a small audience.
          Re-render the strip when we re-enable a multi-hub model:
          change the condition to `visibleHubs.length > 1`. */}
      {false && visibleHubs.length > 1 && (
        <div className="border-t border-border bg-bg-primary/40">
          <div className="px-3 sm:px-4 md:px-6 py-2 flex items-center gap-2 overflow-x-auto">
            {visibleHubs.map(hub => {
              const active = activeHub === hub.id
              return (
                <button
                  key={hub.id}
                  onClick={() => switchHub(hub.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${
                    active ? activeHubClass(hub.accent) : 'bg-bg-card text-text-secondary border-border hover:text-text-primary hover:border-accent/30'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${hubDotClass(hub.accent)}`}
                    aria-hidden="true"
                  />
                  {(() => {
                    const Icon = HUB_ICONS[hub.id]
                    return Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : null
                  })()}
                  <span>{hub.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}

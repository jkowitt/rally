import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useAddons } from '@/hooks/useAddons'
import { useAuth } from '@/hooks/useAuth'
import { useIndustryConfig } from '@/hooks/useIndustryConfig'
import { useActiveHub, detectHub } from '@/hooks/useActiveHub'
import { useUnreadEmails } from '@/hooks/useUnreadEmails'
import { emit } from '@/lib/appEvents'
import { Lightbulb, Sparkles } from 'lucide-react'
import AdditionalFeaturesPanel from '@/components/AdditionalFeaturesPanel'

function getCrmSections(t, propertyType, flags, moduleLabels, addons) {
  const industryItems = []
  if (propertyType === 'nonprofit') {
    industryItems.push({ to: '/app/industry/impact', label: 'Impact Metrics' })
    industryItems.push({ to: '/app/industry/grants', label: 'Grant Tracker' })
    industryItems.push({ to: '/app/industry/donor-portal', label: 'Donor Portal' })
  }
  if (propertyType === 'media') {
    industryItems.push({ to: '/app/industry/campaigns', label: 'Campaigns' })
    industryItems.push({ to: '/app/industry/audience', label: 'Audience' })
    industryItems.push({ to: '/app/industry/media-kit', label: 'Media Kit' })
  }
  if (propertyType === 'realestate') {
    industryItems.push({ to: '/app/industry/occupancy', label: 'Occupancy' })
    industryItems.push({ to: '/app/industry/brokers', label: 'Brokers' })
  }
  if (propertyType === 'entertainment') {
    industryItems.push({ to: '/app/industry/bookings', label: 'Bookings' })
  }
  if (propertyType === 'conference') {
    industryItems.push({ to: '/app/industry/attendees', label: 'Attendees' })
  }
  if (propertyType === 'agency') {
    industryItems.push({ to: '/app/industry/commissions', label: 'Commissions' })
    industryItems.push({ to: '/app/industry/multi-property', label: 'All Properties' })
  }

  const sections = [
    {
      label: 'Overview',
      items: [
        { to: '/app', label: 'Dashboard' },
        { to: '/app/todo', label: 'To-Do List' },
      ],
    },
    {
      label: 'Pipeline',
      items: [
        { to: '/app/crm/pipeline', label: `${t?.deal || 'Deal'} Pipeline` },
        // Accounts (parent-company rollups) hidden for launch — bring
        // back once the AM hub side is wired up.
        { to: '/app/crm/assets', label: t?.asset ? `${t.asset}s` : 'Assets' },
        { to: '/app/crm/declined', label: 'Declined' },
      ],
    },
    {
      // Prospecting tools surfaced inline so the same sidebar shows
      // everywhere — nothing changes when a hub tab is clicked.
      label: 'Prospecting',
      items: [
        { to: '/app/crm/pipeline?find=1', label: 'Find Prospects' },
        { to: '/app/crm/enrichment-queue', label: 'Bulk Enrich' },
        { to: '/app/crm/signals', label: 'Signal Radar' },
        { to: '/app/crm/relationships', label: 'Relationship Search' },
        { to: '/app/crm/sequences', label: 'Sequences' },
        { to: '/app/crm/priority', label: 'Priority Queue' },
        { to: '/app/crm/outreach-analytics', label: 'Outreach Analytics' },
      ],
    },
    {
      label: 'Performance',
      items: [
        { to: '/app/crm/velocity', label: 'Sales Velocity' },
        { to: '/app/crm/analytics', label: 'Sales Analytics' },
        { to: '/app/crm/insights', label: 'AI Insights' },
        { to: '/app/crm/postmortems', label: 'Postmortems' },
      ],
    },
    {
      label: 'Activity',
      items: [
        { to: '/app/crm/inbox', label: 'Inbox', shared: true },
        { to: '/app/crm/activities', label: 'Activity' },
        { to: '/app/crm/tasks', label: 'Tasks' },
      ],
    },
    {
      label: 'Admin',
      items: [
        { to: '/app/crm/audit', label: 'Audit Log' },
      ],
    },
  ]

  if (industryItems.length > 0) {
    sections.push({
      label: 'Industry',
      items: industryItems,
    })
  }

  // Specialty modules are now add-ons. The sidebar gates them via
  // useAddons (read at render time below) AND keeps the legacy
  // feature_flags fallback so any property that had these enabled
  // before migration 081 doesn't lose access. The 081 backfill
  // already inserted property_addons rows for everyone who had
  // the flag, so steady-state we're reading from useAddons.
  if (addons.has('activations') || flags.sportify) {
    sections.push({
      label: moduleLabels.sportify || 'Activations',
      items: [{ to: '/app/sportify/events', label: 'Events' }],
    })
  }
  if (addons.has('valora') || flags.valora) {
    sections.push({
      label: moduleLabels.valora || 'VALORA',
      items: [{ to: '/app/valora', label: 'Valuations' }],
    })
  }
  if (addons.has('businessnow') || flags.businessnow) {
    sections.push({
      label: moduleLabels.businessnow || 'Business Now',
      items: [{ to: '/app/businessnow', label: 'Intelligence' }],
    })
  }

  return sections
}


export default function Sidebar({ collapsed, onToggle, mobile }) {
  const { flags } = useFeatureFlags()
  const addons = useAddons()
  const [addonPanelOpen, setAddonPanelOpen] = useState(false)
  const { isDeveloper, realIsDeveloper, profile } = useAuth()
  const config = useIndustryConfig()
  const moduleLabels = config.moduleLabels || {}
  const t = config.terminology || {}
  const navigate = useNavigate()
  const location = useLocation()
  const { activeHub, setActiveHub } = useActiveHub()
  const { count: unreadEmailCount } = useUnreadEmails()

  const role = profile?.role
  const hasAdminRole = role === 'developer' || role === 'businessops' || role === 'admin'
  const showEmailMarketing =
    (isDeveloper && flags.email_marketing_developer) ||
    (hasAdminRole && flags.email_marketing_public)

  // Profile is the effective (possibly impersonated) profile from useAuth
  const propertyType = profile?.properties?.type || 'other'

  // Auto-switch hub when URL changes to a different hub's territory
  useEffect(() => {
    const detected = detectHub(location.pathname)
    if (detected !== activeHub) {
      setActiveHub(detected)
    }
  }, [location.pathname])

  // One unified sidebar everywhere. Every feature stays visible
  // regardless of which hub tab is active — the hub pill is now
  // a visual context indicator, not a sidebar filter.
  const navSections = getCrmSections(t, propertyType, flags, moduleLabels, addons)

  const width = mobile ? 'w-[280px]' : collapsed ? 'w-16' : 'w-[220px]'
  const showLabels = mobile || !collapsed

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-bg-surface border-r border-border flex flex-col transition-all duration-200 z-40 ${width}`}>
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        {showLabels && (
          <button onClick={() => navigate('/app')} className="font-mono font-bold text-accent text-sm cursor-pointer hover:opacity-80 transition-opacity" style={{letterSpacing:'0.08em',wordSpacing:'-0.3em'}}>LOUD LEGACY</button>
        )}
        <button
          onClick={onToggle}
          className="text-text-muted hover:text-text-primary text-lg"
          aria-label={mobile ? 'Close menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {mobile ? '✕' : collapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {navSections.map((section) => {
          if (section.flag && !flags[section.flag]) return null
          return (
            <div key={section.label} className="mb-4">
              {showLabels && (
                <div className="px-4 mb-1 text-[10px] uppercase tracking-widest text-text-muted font-mono">
                  {section.label}
                </div>
              )}
              {section.items.map((item) => {
                const isInbox = item.to === '/app/crm/inbox'
                const showInboxDot = isInbox && unreadEmailCount > 0
                return (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.to === '/app' || item.to === '/app/marketing' || item.to === '/app/ops' || item.to === '/app/accounts'}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        isActive
                          ? 'text-accent bg-accent/5 border-r-2 border-accent'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                      } ${!showLabels ? 'justify-center' : ''}`
                    }
                  >
                    {showLabels && (
                      <span className="flex-1 inline-flex items-center justify-between gap-2">
                        <span>{item.label}</span>
                        {showInboxDot && (
                          <span
                            className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-bg-primary text-[10px] font-mono font-semibold leading-none"
                            title={`${unreadEmailCount} unread email${unreadEmailCount === 1 ? '' : 's'}`}
                          >
                            {unreadEmailCount > 9 ? '9+' : unreadEmailCount}
                          </span>
                        )}
                      </span>
                    )}
                    {/* In collapsed mode, just a dot — no count text. */}
                    {!showLabels && showInboxDot && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" aria-label={`${unreadEmailCount} unread`} />
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {showLabels && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {/* "Additional Features" surfaces the add-on catalog and is
              gated behind feature_flags.dev_addon_panel (default OFF
              until the catalog is ready to sell). "Suggest a Feature"
              stays visible for everyone — it's a pure feedback
              channel and doesn't promise anything for sale. */}
          {flags.dev_addon_panel && (
            <button
              onClick={() => setAddonPanelOpen(true)}
              className="w-full flex items-center gap-1.5 text-left text-[11px] text-accent hover:opacity-80 transition-opacity font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Additional Features
            </button>
          )}
          <button
            onClick={() => emit('open-suggestion')}
            className="w-full flex items-center gap-1.5 text-left text-[11px] text-text-muted hover:text-accent transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
            Suggest a Feature
          </button>
          <div className="text-[10px] text-text-muted font-mono">v1.0.0</div>
        </div>
      )}
      <AdditionalFeaturesPanel open={addonPanelOpen} onClose={() => setAddonPanelOpen(false)} />
    </aside>
  )
}

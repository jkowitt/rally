import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useAuth } from '@/hooks/useAuth'
import { useIndustryConfig } from '@/hooks/useIndustryConfig'

// ─── Hub definitions ──────────────────────────────────────
// Each hub has an id, label, icon (for collapsed view), and
// a function that returns its nav sections given the current
// flags/config/role context.

const HUBS = [
  { id: 'crm', label: 'CRM', icon: '📊' },
  { id: 'marketing', label: 'Marketing', icon: '📢' },
  { id: 'ops', label: 'Operations', icon: '⚙' },
]

function getCrmSections(t, propertyType, flags, moduleLabels) {
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
      items: [{ to: '/app', label: 'Dashboard' }],
    },
    {
      label: 'Pipeline',
      flag: 'crm',
      items: [
        { to: '/app/crm/assets', label: t?.asset ? `${t.asset}s` : 'Assets' },
        { to: '/app/crm/pipeline', label: `${t?.deal || 'Deal'} Pipeline` },
        { to: '/app/crm/contracts', label: 'Contracts' },
        { to: '/app/crm/fulfillment', label: t?.fulfillment || 'Fulfillment' },
        { to: '/app/crm/projects', label: 'Projects' },
        { to: '/app/crm/declined', label: 'Declined' },
      ],
    },
    {
      label: 'Activity',
      flag: 'crm',
      items: [
        { to: '/app/crm/activities', label: 'Timeline' },
        { to: '/app/crm/tasks', label: 'Tasks' },
        { to: '/app/crm/insights', label: 'AI Insights' },
        { to: '/app/crm/analytics', label: 'Sales Analytics' },
      ],
    },
  ]

  if (industryItems.length > 0) {
    sections.push({
      label: 'Industry',
      items: industryItems,
    })
  }

  // Sportify, VALORA, BusinessNow — flag-gated modules
  if (flags.sportify) {
    sections.push({
      label: moduleLabels.sportify || 'Sportify',
      items: [{ to: '/app/sportify/events', label: 'Events' }],
    })
  }
  if (flags.valora) {
    sections.push({
      label: moduleLabels.valora || 'VALORA',
      items: [{ to: '/app/valora', label: 'Valuations' }],
    })
  }
  if (flags.businessnow) {
    sections.push({
      label: moduleLabels.businessnow || 'Business Now',
      items: [{ to: '/app/businessnow', label: 'Intelligence' }],
    })
  }

  return sections
}

function getMarketingSections(flags, isDeveloper, showEmailMarketing) {
  const sections = [
    {
      label: 'Overview',
      items: [{ to: '/app/marketing', label: 'Marketing Dashboard' }],
    },
  ]

  if (showEmailMarketing) {
    sections.push({
      label: 'Email',
      items: [
        { to: '/app/marketing/email/campaigns', label: 'Campaigns' },
        { to: '/app/marketing/email/lists', label: 'Lists' },
        { to: '/app/marketing/email/subscribers', label: 'Subscribers' },
        { to: '/app/marketing/email/templates', label: 'Templates' },
      ],
    })
  }

  sections.push({
    label: 'The Digest',
    items: [
      { to: '/app/developer/digest', label: 'Issues' },
      { to: '/app/crm/newsletter', label: 'Newsletter' },
    ],
  })

  if (flags.client_growth_hub) {
    const growthItems = [{ to: '/app/growth', label: 'Growth Hub' }]
    if (flags.client_marketing_hub) growthItems.push({ to: '/app/growth', label: 'Marketing Hub' })
    if (flags.client_ad_spend) growthItems.push({ to: '/app/growth', label: 'Ad Spend' })
    if (flags.client_connection_manager) growthItems.push({ to: '/app/growth', label: 'Connections' })
    sections.push({ label: 'Growth', items: growthItems })
  }

  if (isDeveloper) {
    sections.push({
      label: 'Automations',
      items: [
        { to: '/app/crm/automations', label: 'Sequences' },
        { to: '/app/admin/automation', label: 'Control Center' },
        { to: '/app/admin/social-queue', label: 'Social Queue' },
        { to: '/app/admin/email-queue', label: 'Email Queue' },
      ],
    })
  }

  return sections
}

function getOpsSections(flags, isDeveloper, hasAdminRole) {
  const sections = [
    {
      label: 'Overview',
      items: [{ to: '/app/ops', label: 'Ops Dashboard' }],
    },
  ]

  if (flags.client_finance_dashboard || flags.client_financial_projections || isDeveloper) {
    const finItems = []
    if (isDeveloper) finItems.push({ to: '/app/businessops', label: 'Business Ops' })
    if (flags.client_finance_dashboard) finItems.push({ to: '/app/growth', label: 'Finance' })
    if (flags.client_goal_tracker) finItems.push({ to: '/app/growth', label: 'Goals' })
    if (finItems.length > 0) sections.push({ label: 'Finance', items: finItems })
  }

  sections.push({
    label: 'Team',
    items: [
      { to: '/app/crm/team', label: 'Team Manager' },
    ],
  })

  sections.push({
    label: 'Billing',
    items: [
      { to: '/app/settings', label: 'Plan & Usage' },
      { to: '/app/settings/addons', label: 'Addons' },
      { to: '/app/settings/billing', label: 'Billing History' },
    ],
  })

  if (isDeveloper || hasAdminRole) {
    const adminItems = [
      { to: '/app/developer', label: 'Dev Tools' },
    ]
    if (isDeveloper) {
      adminItems.push({ to: '/app/developer/qa-comments', label: 'QA Reports' })
      adminItems.push({ to: '/app/developer/auto-qa', label: 'Auto QA' })
      adminItems.push({ to: '/app/admin/trials', label: 'Trials' })
      adminItems.push({ to: '/app/admin/ads', label: 'Ads' })
      adminItems.push({ to: '/app/admin/notifications', label: 'Notifications' })
      adminItems.push({ to: '/app/admin/daily-digest', label: 'Daily Digest' })
    }
    sections.push({ label: 'Admin', items: adminItems })
  }

  return sections
}

// ─── Hub auto-detection ────────────────────────────────────
// When the user navigates via a direct URL or bookmark, detect
// which hub the current path belongs to and switch automatically.
function detectHub(pathname) {
  if (pathname.startsWith('/app/marketing')) return 'marketing'
  if (pathname.startsWith('/app/ops')) return 'ops'
  if (pathname.startsWith('/app/admin')) return 'ops'
  if (pathname.startsWith('/app/businessops')) return 'ops'
  if (pathname.startsWith('/app/developer')) return 'ops'
  if (pathname.startsWith('/app/settings')) return 'ops'
  if (pathname.startsWith('/app/growth')) return 'marketing'
  return 'crm'
}

// ─── Main component ────────────────────────────────────────

export default function Sidebar({ collapsed, onToggle, mobile }) {
  const { flags } = useFeatureFlags()
  const { isDeveloper, profile } = useAuth()
  const config = useIndustryConfig()
  const moduleLabels = config.moduleLabels || {}
  const t = config.terminology || {}
  const navigate = useNavigate()
  const location = useLocation()

  const role = profile?.role
  const hasAdminRole = role === 'developer' || role === 'businessops' || role === 'admin'
  const showEmailMarketing =
    (isDeveloper && flags.email_marketing_developer) ||
    (hasAdminRole && flags.email_marketing_public)

  const qaOverride = typeof window !== 'undefined' ? localStorage.getItem('ll_qa_industry') : null
  const propertyType = (isDeveloper && qaOverride) ? qaOverride : (profile?.properties?.type || 'other')

  // Hub state — persisted in localStorage, auto-detected from URL on mount
  const [activeHub, setActiveHub] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('ll_active_hub') : null
    if (saved && HUBS.some(h => h.id === saved)) return saved
    return detectHub(typeof window !== 'undefined' ? window.location.pathname : '/app')
  })

  // Auto-switch hub when URL changes to a different hub's territory
  useEffect(() => {
    const detected = detectHub(location.pathname)
    if (detected !== activeHub) {
      setActiveHub(detected)
      localStorage.setItem('ll_active_hub', detected)
    }
  }, [location.pathname])

  function switchHub(hubId) {
    setActiveHub(hubId)
    localStorage.setItem('ll_active_hub', hubId)
  }

  // Determine which hubs are visible to this role
  const visibleHubs = HUBS.filter(h => {
    if (h.id === 'crm') return true
    if (h.id === 'marketing') return isDeveloper || showEmailMarketing || flags.client_growth_hub
    if (h.id === 'ops') return isDeveloper || hasAdminRole
    return false
  })

  // Build nav sections for the active hub
  let navSections = []
  if (activeHub === 'crm') {
    navSections = getCrmSections(t, propertyType, flags, moduleLabels)
  } else if (activeHub === 'marketing') {
    navSections = getMarketingSections(flags, isDeveloper, showEmailMarketing)
  } else if (activeHub === 'ops') {
    navSections = getOpsSections(flags, isDeveloper, hasAdminRole)
  }

  const width = mobile ? 'w-[280px]' : collapsed ? 'w-16' : 'w-[220px]'
  const showLabels = mobile || !collapsed

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-bg-surface border-r border-border flex flex-col transition-all duration-200 z-40 ${width}`}>
      {/* Logo */}
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

      {/* Hub picker — only shown if user has access to 2+ hubs */}
      {visibleHubs.length > 1 && (
        <div className={`border-b border-border ${showLabels ? 'px-3 py-2' : 'px-1 py-2'}`}>
          {showLabels ? (
            <div className="flex gap-1">
              {visibleHubs.map(hub => (
                <button
                  key={hub.id}
                  onClick={() => switchHub(hub.id)}
                  className={`flex-1 text-[10px] font-mono uppercase tracking-wider py-1.5 px-2 rounded transition-all ${
                    activeHub === hub.id
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent'
                  }`}
                >
                  {hub.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {visibleHubs.map(hub => (
                <button
                  key={hub.id}
                  onClick={() => switchHub(hub.id)}
                  title={hub.label}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-all ${
                    activeHub === hub.id
                      ? 'bg-accent/15 border border-accent/30'
                      : 'text-text-muted hover:bg-bg-card border border-transparent'
                  }`}
                >
                  {hub.icon}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation — hub-scoped */}
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
              {section.items.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  end={item.to === '/app' || item.to === '/app/marketing' || item.to === '/app/ops'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-accent bg-accent/5 border-r-2 border-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                    } ${!showLabels ? 'justify-center' : ''}`
                  }
                >
                  {showLabels && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Bottom — always visible regardless of hub */}
      {showLabels && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-suggestion'))}
            className="w-full text-left text-[10px] text-text-muted hover:text-accent font-mono transition-colors"
          >
            💡 Suggest a Feature
          </button>
          <div className="text-[10px] text-text-muted font-mono">v1.0.0</div>
        </div>
      )}
    </aside>
  )
}

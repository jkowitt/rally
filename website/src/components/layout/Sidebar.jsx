import { useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useAuth } from '@/hooks/useAuth'
import { useIndustryConfig } from '@/hooks/useIndustryConfig'
import { useActiveHub, detectHub } from '@/hooks/useActiveHub'
import { emit } from '@/lib/appEvents'

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
      label: 'Prospecting & Pipeline',
      flag: 'crm',
      items: [
        { to: '/app/crm/assets', label: t?.asset ? `${t.asset}s` : 'Assets' },
        { to: '/app/crm/pipeline', label: `${t?.deal || 'Deal'} Pipeline` },
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

function getAccountsSections(t) {
  return [
    {
      label: 'Overview',
      items: [{ to: '/app/accounts', label: 'Account Management' }],
    },
    {
      label: 'Active Accounts',
      items: [
        { to: '/app/crm/contracts', label: 'Contracts' },
        { to: '/app/crm/fulfillment', label: t?.fulfillment || 'Fulfillment' },
      ],
    },
  ]
}

function getOpsSections(flags, isDeveloper, hasAdminRole, showEmailMarketing) {
  const sections = [
    {
      label: 'Overview',
      items: [{ to: '/app/ops', label: 'Ops Dashboard' }],
    },
  ]

  // Marketing — folded into Ops
  const marketingItems = [{ to: '/app/marketing', label: 'Marketing Dashboard' }]
  if (showEmailMarketing) {
    marketingItems.push({ to: '/app/marketing/email/campaigns', label: 'Email Campaigns' })
    marketingItems.push({ to: '/app/marketing/email/lists', label: 'Lists' })
    marketingItems.push({ to: '/app/marketing/email/subscribers', label: 'Subscribers' })
    marketingItems.push({ to: '/app/marketing/email/templates', label: 'Templates' })
  }
  marketingItems.push({ to: '/app/ops/newsletter', label: 'Newsletter' })
  marketingItems.push({ to: '/app/developer/digest', label: 'The Digest' })
  if (flags.client_growth_hub) {
    marketingItems.push({ to: '/app/growth', label: 'Growth Hub' })
  }
  sections.push({ label: 'Marketing', items: marketingItems })

  // Projects — moved here from CRM (project management for the team)
  sections.push({
    label: 'Projects',
    items: [
      { to: '/app/ops/projects', label: 'All Projects' },
    ],
  })

  // Finance
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
      { to: '/app/ops/team', label: 'Team Manager' },
    ],
  })

  if (isDeveloper) {
    sections.push({
      label: 'Automations',
      items: [
        { to: '/app/ops/automations', label: 'Sequences' },
        { to: '/app/admin/automation', label: 'Control Center' },
        { to: '/app/admin/social-queue', label: 'Social Queue' },
        { to: '/app/admin/email-queue', label: 'Email Queue' },
      ],
    })
  }

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

export default function Sidebar({ collapsed, onToggle, mobile }) {
  const { flags } = useFeatureFlags()
  const { isDeveloper, profile } = useAuth()
  const config = useIndustryConfig()
  const moduleLabels = config.moduleLabels || {}
  const t = config.terminology || {}
  const navigate = useNavigate()
  const location = useLocation()
  const { activeHub, setActiveHub } = useActiveHub()

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

  let navSections = []
  if (activeHub === 'crm') {
    navSections = getCrmSections(t, propertyType, flags, moduleLabels)
  } else if (activeHub === 'accounts') {
    navSections = getAccountsSections(t)
  } else if (activeHub === 'ops') {
    navSections = getOpsSections(flags, isDeveloper, hasAdminRole, showEmailMarketing)
  }

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
              {section.items.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  end={item.to === '/app' || item.to === '/app/marketing' || item.to === '/app/ops' || item.to === '/app/accounts'}
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

      {showLabels && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <button
            onClick={() => emit('open-suggestion')}
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

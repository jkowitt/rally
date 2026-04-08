import { NavLink, useNavigate } from 'react-router-dom'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useAuth } from '@/hooks/useAuth'
import { useIndustryConfig } from '@/hooks/useIndustryConfig'

function getNavSections(t, propertyType) {
  const industryItems = []

  // Nonprofit modules
  if (propertyType === 'nonprofit') {
    industryItems.push({ to: '/app/industry/impact', label: 'Impact Metrics' })
    industryItems.push({ to: '/app/industry/grants', label: 'Grant Tracker' })
    industryItems.push({ to: '/app/industry/donor-portal', label: 'Donor Portal' })
  }
  // Media modules
  if (propertyType === 'media') {
    industryItems.push({ to: '/app/industry/campaigns', label: 'Campaigns' })
    industryItems.push({ to: '/app/industry/audience', label: 'Audience' })
    industryItems.push({ to: '/app/industry/media-kit', label: 'Media Kit' })
  }
  // Real estate modules
  if (propertyType === 'realestate') {
    industryItems.push({ to: '/app/industry/occupancy', label: 'Occupancy' })
    industryItems.push({ to: '/app/industry/brokers', label: 'Brokers' })
  }
  // Entertainment modules
  if (propertyType === 'entertainment') {
    industryItems.push({ to: '/app/industry/bookings', label: 'Bookings' })
  }
  // Conference modules
  if (propertyType === 'conference') {
    industryItems.push({ to: '/app/industry/attendees', label: 'Attendees' })
  }
  // Agency modules
  if (propertyType === 'agency') {
    industryItems.push({ to: '/app/industry/commissions', label: 'Commissions' })
    industryItems.push({ to: '/app/industry/multi-property', label: 'All Properties' })
  }

  return [
  {
    label: 'Overview',
    items: [
      { to: '/app', label: 'Dashboard' },
    ],
  },
  {
    label: 'Legacy CRM',
    flag: 'crm',
    items: [
      { to: '/app/crm/assets', label: t?.asset ? `${t.asset}s` : 'Assets' },
      { to: '/app/crm/pipeline', label: `${t?.deal || 'Deal'} Pipeline` },
      { to: '/app/crm/contracts', label: 'Contracts' },
      { to: '/app/crm/fulfillment', label: t?.fulfillment || 'Fulfillment' },
      { to: '/app/crm/activities', label: 'Activities' },
      { to: '/app/crm/tasks', label: 'Tasks' },
      { to: '/app/crm/insights', label: 'AI Insights' },
      { to: '/app/crm/newsletter', label: 'Newsletter' },
      { to: '/app/crm/team', label: 'Team' },
      { to: '/app/crm/automations', label: 'Automations' },
      ...industryItems,
    ],
  },
  {
    label: 'Sportify',
    flag: 'sportify',
    items: [
      { to: '/app/sportify/events', label: 'Events' },
    ],
  },
  {
    label: 'VALORA',
    flag: 'valora',
    items: [
      { to: '/app/valora', label: 'Valuations' },
    ],
  },
  {
    label: 'Business Now',
    flag: 'businessnow',
    items: [
      { to: '/app/businessnow', label: 'Intelligence' },
    ],
  },
]}

export default function Sidebar({ collapsed, onToggle, mobile }) {
  const { flags } = useFeatureFlags()
  const { isDeveloper, profile } = useAuth()
  const config = useIndustryConfig()
  const moduleLabels = config.moduleLabels || {}
  const t = config.terminology || {}
  const qaOverride = typeof window !== 'undefined' ? localStorage.getItem('ll_qa_industry') : null
  const propertyType = (isDeveloper && qaOverride) ? qaOverride : (profile?.properties?.type || 'other')
  const navSections = getNavSections(t, propertyType)
  const navigate = useNavigate()

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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navSections.map((section) => {
          if (section.flag && !flags[section.flag]) return null
          return (
            <div key={section.label} className="mb-4">
              {showLabels && (
                <div className="px-4 mb-1 text-[10px] uppercase tracking-widest text-text-muted font-mono">
                  {section.flag === 'sportify' ? (moduleLabels.sportify || section.label) :
                   section.flag === 'valora' ? (moduleLabels.valora || section.label) :
                   section.flag === 'businessnow' ? (moduleLabels.businessnow || section.label) :
                   section.label}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/app'}
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

        {/* Declined - separate from main pipeline */}
        {flags.crm && (
          <div className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-1 text-[10px] uppercase tracking-widest text-text-muted font-mono">
                Archive
              </div>
            )}
            <NavLink
              to="/app/crm/declined"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-accent bg-accent/5 border-r-2 border-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                } ${!showLabels ? 'justify-center' : ''}`
              }
            >
              {showLabels && <span>Declined</span>}
            </NavLink>
          </div>
        )}

        {/* Developer section */}
        {isDeveloper && (
          <div className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-1 text-[10px] uppercase tracking-widest text-text-muted font-mono">
                Developer
              </div>
            )}
            <NavLink
              to="/app/developer"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-accent bg-accent/5 border-r-2 border-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                } ${!showLabels ? 'justify-center' : ''}`
              }
            >
              {showLabels && <span>Dev Tools</span>}
            </NavLink>
          </div>
        )}
        {/* Settings */}
        <div className="mb-4 mt-auto pt-2 border-t border-border">
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                isActive ? 'text-accent bg-accent/5 border-r-2 border-accent' : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
              } ${!showLabels ? 'justify-center' : ''}`
            }
          >
            {showLabels && <span>Settings</span>}
          </NavLink>
          <NavLink
            to="/app/custom-dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                isActive ? 'text-accent bg-accent/5 border-r-2 border-accent' : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
              } ${!showLabels ? 'justify-center' : ''}`
            }
          >
            {showLabels && <span>Custom Dashboard</span>}
          </NavLink>
        </div>
      </nav>

      {/* User */}
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

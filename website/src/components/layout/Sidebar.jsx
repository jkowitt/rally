import { NavLink } from 'react-router-dom'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useAuth } from '@/hooks/useAuth'

const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/app', label: 'Dashboard', icon: '◉' },
    ],
  },
  {
    label: 'Legacy CRM',
    flag: 'crm',
    items: [
      { to: '/app/crm/assets', label: 'Assets', icon: '▣' },
      { to: '/app/crm/pipeline', label: 'Pipeline', icon: '▤' },
      { to: '/app/crm/contracts', label: 'Contracts', icon: '▥' },
      { to: '/app/crm/fulfillment', label: 'Fulfillment', icon: '▦' },
    ],
  },
  {
    label: 'Sportify',
    flag: 'sportify',
    items: [
      { to: '/app/sportify/events', label: 'Events', icon: '◈' },
    ],
  },
  {
    label: 'VALORA',
    flag: 'valora',
    items: [
      { to: '/app/valora', label: 'Valuations', icon: '◇' },
    ],
  },
  {
    label: 'Business Now',
    flag: 'businessnow',
    items: [
      { to: '/app/businessnow', label: 'Intelligence', icon: '◆' },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { flags } = useFeatureFlags()
  const { isDeveloper } = useAuth()

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-bg-surface border-r border-border flex flex-col transition-all duration-200 z-40 ${collapsed ? 'w-16' : 'w-[220px]'}`}>
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <span className="font-mono font-bold text-accent text-sm tracking-wide">LOUD LEGACY</span>
        )}
        <button
          onClick={onToggle}
          className="text-text-muted hover:text-text-primary text-lg"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navSections.map((section) => {
          if (section.flag && !flags[section.flag]) return null
          return (
            <div key={section.label} className="mb-4">
              {!collapsed && (
                <div className="px-4 mb-1 text-[10px] uppercase tracking-widest text-text-muted font-mono">
                  {section.label}
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
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
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
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <span className="text-base">✗</span>
              {!collapsed && <span>Declined</span>}
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
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <span className="text-base">⚙</span>
              {!collapsed && <span>Dev Tools</span>}
            </NavLink>
          </div>
        )}
      </nav>

      {/* User */}
      {!collapsed && (
        <div className="border-t border-border px-4 py-3">
          <div className="text-xs text-text-muted font-mono">v0.1.0</div>
        </div>
      )}
    </aside>
  )
}

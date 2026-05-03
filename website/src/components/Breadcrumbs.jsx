import { Link, useLocation } from 'react-router-dom'
import { useActiveHub, HUBS, getHubLandingPath } from '@/hooks/useActiveHub'

// Reusable breadcrumb trail. Pages can either:
//   <Breadcrumbs />                                 → auto-derives from URL + active hub
//   <Breadcrumbs items={[{label, to}, ...]} />      → explicit override
//
// Auto mode finds the active hub, links to its landing page, then
// renders the current page name from the URL's last segment.
export default function Breadcrumbs({ items, className = '' }) {
  const location = useLocation()
  const { activeHub } = useActiveHub()

  const trail = items || autoTrail(location.pathname, activeHub)
  if (!trail.length) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-xs font-mono text-text-muted flex items-center flex-wrap gap-1 mb-3 ${className}`}
    >
      {trail.map((item, i) => {
        const last = i === trail.length - 1
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {item.to && !last ? (
              <Link
                to={item.to}
                className="hover:text-accent transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={last ? 'text-text-secondary' : ''}>{item.label}</span>
            )}
            {!last && <span className="text-text-muted/50">/</span>}
          </span>
        )
      })}
    </nav>
  )
}

const SEGMENT_LABELS = {
  app: 'Home',
  crm: 'CRM',
  accounts: 'Account Management',
  ops: 'Operations',
  marketing: 'Marketing',
  pipeline: 'Pipeline',
  contracts: 'Contracts',
  fulfillment: 'Fulfillment',
  assets: 'Assets',
  contacts: 'Contacts',
  tasks: 'Tasks',
  insights: 'AI Insights',
  analytics: 'Sales Analytics',
  activities: 'Activity Timeline',
  team: 'Team Manager',
  newsletter: 'Newsletter',
  automations: 'Automations',
  settings: 'Settings',
  billing: 'Billing History',
  addons: 'Addons',
  developer: 'Developer Tools',
  declined: 'Declined Deals',
  projects: 'Projects',
  industry: 'Industry',
  growth: 'Growth Hub',
  email: 'Email Marketing',
  campaigns: 'Campaigns',
  lists: 'Lists',
  subscribers: 'Subscribers',
  templates: 'Templates',
}

function autoTrail(pathname, activeHub) {
  const segs = pathname.split('/').filter(Boolean)
  if (segs.length === 0 || segs[0] !== 'app') return []

  const hub = HUBS.find(h => h.id === activeHub)
  const items = []

  if (hub) {
    items.push({ label: hub.label, to: getHubLandingPath(hub.id) })
  }

  // Last meaningful segment (skip dynamic params that look like uuids/numbers)
  for (let i = 1; i < segs.length; i++) {
    const seg = segs[i]
    if (!seg) continue
    if (/^[0-9a-f-]{8,}$/i.test(seg)) continue
    const label = SEGMENT_LABELS[seg] || seg.replace(/[-_]/g, ' ')
    const to = '/' + segs.slice(0, i + 1).join('/')
    items.push({ label, to: i === segs.length - 1 ? null : to })
  }

  // Avoid trivial trails (just one segment that equals the hub)
  if (items.length <= 1) return []
  return items
}

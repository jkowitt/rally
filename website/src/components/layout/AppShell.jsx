import { useState, useEffect, lazy, Suspense } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import GlobalSearch from '../GlobalSearch'
import ImpersonationBanner from '../ImpersonationBanner'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { useUsageHeartbeat } from '@/hooks/useUsageHeartbeat'
import { on } from '@/lib/appEvents'
import {
  Home, LayoutGrid, Target, CheckSquare, Handshake,
  FileText, Settings, Users, SlidersHorizontal,
} from 'lucide-react'

const FeatureSuggestion = lazy(() => import('../FeatureSuggestion'))
const PropertyBootstrap = lazy(() => import('../onboarding/PropertyBootstrap'))

export default function AppShell({ children }) {
  useSessionTimeout()
  useUsageHeartbeat()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // null = closed; otherwise the modal renders in the matching kind.
  // Two channels feed it: 'open-suggestion' for the sidebar feature
  // request, 'open-issue' for the floating bug bubble.
  const [feedbackKind, setFeedbackKind] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  // Listen for both feedback triggers
  useEffect(() => on('open-suggestion', () => setFeedbackKind('feature')), [])
  useEffect(() => on('open-issue', () => setFeedbackKind('issue')), [])

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[280px] mobile-slide-in">
            <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} mobile />
          </div>
        </div>
      )}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <div className={`flex-1 flex flex-col transition-all duration-200 ml-0 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-[220px]'}`}>
        <ImpersonationBanner />
        <TopBar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} mobileMenuOpen={mobileMenuOpen} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          {children}
        </main>
        <footer className="hidden md:flex border-t border-border px-6 py-3 items-center justify-between text-xs text-text-muted">
          <span>&copy; {new Date().getFullYear()} Loud Legacy</span>
          <div className="flex gap-4">
            <a href="/legal/terms" className="hover:text-text-secondary">Terms of Service</a>
            <a href="/legal/privacy" className="hover:text-text-secondary">Privacy Policy</a>
            <a href="mailto:jason@loud-legacy.com" className="hover:text-text-secondary">Contact</a>
          </div>
        </footer>

        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </div>

      {/* Bootstrap a workspace for users who somehow ended up signed
          in without one (email-confirmation flow + legacy accounts).
          Renders nothing when profile.property_id is set. */}
      <Suspense fallback={null}>
        <PropertyBootstrap />
      </Suspense>

      {/* Feedback modal (both feature requests + bug reports). The
          'open-issue' trigger now comes from the TopBar bug button;
          the legacy bottom-right floater has been retired so it no
          longer collides with the page footer. */}
      {feedbackKind && (
        <Suspense fallback={null}>
          <FeatureSuggestion kind={feedbackKind} onClose={() => setFeedbackKind(null)} />
        </Suspense>
      )}

    </div>
  )
}

function MobileBottomNav() {
  const { flags } = useFeatureFlags()
  const location = useLocation()
  const path = location.pathname

  // Tabs are hub-aware: we show Home + the most-used destination in
  // each hub the user has access to. Scrolls horizontally on small
  // phones so we never have to truncate or hide entries.
  const tabs = [
    { to: '/app', label: 'Home', icon: Home, exact: true },
    ...(flags.crm ? [
      { to: '/app/crm/pipeline', label: 'Pipeline', icon: LayoutGrid },
      { to: '/app/crm/assets', label: 'Assets', icon: Target },
      { to: '/app/crm/tasks', label: 'Tasks', icon: CheckSquare },
    ] : []),
    { to: '/app/accounts', label: 'Accounts', icon: Handshake },
    { to: '/app/crm/contracts', label: 'Contracts', icon: FileText },
    { to: '/app/ops', label: 'Ops', icon: Settings },
    { to: '/app/ops/team', label: 'Team', icon: Users },
    { to: '/app/settings', label: 'Settings', icon: SlidersHorizontal },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border safe-pb z-40 md:hidden"
      aria-label="Primary mobile navigation"
    >
      <div className="flex items-center gap-1 py-2 px-2 overflow-x-auto scroll-smooth">
        {tabs.map(tab => {
          const isActive = tab.exact ? (path === '/app' || path === '/app/') : path.startsWith(tab.to)
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to + tab.label}
              to={tab.to}
              end={tab.exact}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                isActive ? 'text-accent bg-accent/10' : 'text-text-muted active:text-text-secondary'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

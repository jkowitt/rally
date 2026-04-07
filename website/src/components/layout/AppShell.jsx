import { useState, useEffect, lazy, Suspense } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import GlobalSearch from '../GlobalSearch'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'

const FeatureSuggestion = lazy(() => import('../FeatureSuggestion'))

export default function AppShell({ children }) {
  useSessionTimeout()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
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

  // Listen for suggestion modal trigger
  useEffect(() => {
    const handler = () => setShowSuggestion(true)
    window.addEventListener('open-suggestion', handler)
    return () => window.removeEventListener('open-suggestion', handler)
  }, [])

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

      {/* Feature suggestion modal */}
      {showSuggestion && (
        <Suspense fallback={null}>
          <FeatureSuggestion onClose={() => setShowSuggestion(false)} />
        </Suspense>
      )}

    </div>
  )
}

function MobileBottomNav() {
  const { flags } = useFeatureFlags()
  const location = useLocation()
  const path = location.pathname

  const tabs = [
    { to: '/app', icon: '◉', label: 'Home', exact: true },
    ...(flags.crm ? [
      { to: '/app/crm/pipeline', icon: '▤', label: 'Pipeline' },
      { to: '/app/crm/contracts', icon: '▥', label: 'Contracts' },
      { to: '/app/crm/newsletter', icon: '▧', label: 'News' },
      { to: '/app/crm/assets', icon: '▣', label: 'Assets' },
    ] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border flex items-center justify-around py-1.5 safe-pb z-40 md:hidden">
      {tabs.map(tab => {
        const isActive = tab.exact ? (path === '/app' || path === '/app/') : path.startsWith(tab.to)
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px] ${
              isActive ? 'text-accent' : 'text-text-muted active:text-text-secondary'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="text-[9px] font-mono leading-none">{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

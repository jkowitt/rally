import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import GlobalSearch from '../GlobalSearch'

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

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

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className={`flex-1 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'ml-16' : 'ml-[220px]'}`}>
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
        <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-text-muted">
          <span>&copy; {new Date().getFullYear()} Loud Legacy</span>
          <div className="flex gap-4">
            <a href="/legal/terms" className="hover:text-text-secondary">Terms of Service</a>
            <a href="/legal/privacy" className="hover:text-text-secondary">Privacy Policy</a>
            <a href="mailto:jason@loud-legacy.com" className="hover:text-text-secondary">Contact</a>
          </div>
        </footer>
      </div>
    </div>
  )
}

import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
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

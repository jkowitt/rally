import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import DeveloperOnly from '@/components/dev/DeveloperOnly'

const EmailDashboard = lazy(() => import('./EmailDashboard'))
const EmailLists = lazy(() => import('./EmailLists'))
const EmailSubscribers = lazy(() => import('./EmailSubscribers'))
const EmailImport = lazy(() => import('./EmailImport'))
const EmailCampaigns = lazy(() => import('./EmailCampaigns'))
const CampaignBuilder = lazy(() => import('./CampaignBuilder'))
const CampaignAnalytics = lazy(() => import('./CampaignAnalytics'))
const EmailTemplatesPage = lazy(() => import('./EmailTemplatesPage'))
const EmailConversations = lazy(() => import('./EmailConversations'))
const EmailSync = lazy(() => import('./EmailSync'))
const SyncSettings = lazy(() => import('./SyncSettings'))
const EmailSettings = lazy(() => import('./EmailSettings'))

/**
 * /dev/email/* — all email marketing pages share a common layout
 * with top-level tab nav. Every page is wrapped in the
 * email_marketing_developer flag guard so the feature silently
 * disappears when the flag is off.
 */
export default function EmailRouter() {
  return (
    <DeveloperOnly flag="email_marketing_developer">
      <EmailShell>
        <Suspense fallback={null}>
          <Routes>
            <Route index element={<EmailDashboard />} />
            <Route path="lists" element={<EmailLists />} />
            <Route path="subscribers" element={<EmailSubscribers />} />
            <Route path="import" element={<EmailImport />} />
            <Route path="campaigns" element={<EmailCampaigns />} />
            <Route path="campaigns/new" element={<CampaignBuilder />} />
            <Route path="campaigns/:id/edit" element={<CampaignBuilder />} />
            <Route path="campaigns/:id/analytics" element={<CampaignAnalytics />} />
            <Route path="templates" element={<EmailTemplatesPage />} />
            <Route path="conversations" element={<EmailConversations />} />
            <Route path="conversations/:id" element={<EmailConversations />} />
            <Route path="sync" element={<EmailSync />} />
            <Route path="sync-settings" element={<SyncSettings />} />
            <Route path="settings" element={<EmailSettings />} />
            <Route path="*" element={<Navigate to="/dev/email" replace />} />
          </Routes>
        </Suspense>
      </EmailShell>
    </DeveloperOnly>
  )
}

function EmailShell({ children }) {
  const loc = useLocation()
  const tabs = [
    { to: '/dev/email', label: 'Dashboard', match: (p) => p === '/dev/email' || p === '/dev/email/' },
    { to: '/dev/email/lists', label: 'Lists' },
    { to: '/dev/email/subscribers', label: 'Subscribers' },
    { to: '/dev/email/campaigns', label: 'Campaigns' },
    { to: '/dev/email/templates', label: 'Templates' },
    { to: '/dev/email/conversations', label: 'Conversations' },
    { to: '/dev/email/sync', label: 'Pipeline Sync' },
    { to: '/dev/email/settings', label: 'Settings' },
  ]
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="border-b border-border sticky top-0 z-10 bg-bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
            <h1 className="text-sm font-semibold">Email Marketing</h1>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map(t => {
            const active = t.match ? t.match(loc.pathname) : loc.pathname.startsWith(t.to)
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${active ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}

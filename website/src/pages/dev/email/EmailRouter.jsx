import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useEmailMarketingAccess } from '@/hooks/useEmailMarketingAccess'

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
 * /app/marketing/email/* — all email marketing pages share a common
 * layout with top-level tab nav.
 *
 * Access is gated by useEmailMarketingAccess which mirrors the
 * can_access_email_marketing() RLS helper in migration 054:
 *   - developer role + email_marketing_developer flag → full access
 *   - admin/businessops/developer + email_marketing_public flag → beta access
 *
 * Unauthorized users are silently redirected to /app — they never see
 * a "forbidden" message; the feature simply does not exist to them.
 */
export default function EmailRouter() {
  const { granted, ready, mode } = useEmailMarketingAccess()
  if (!ready) return null
  if (!granted) return <Navigate to="/app" replace />

  return (
    <EmailShell mode={mode}>
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
          <Route path="*" element={<Navigate to="/app/marketing/email" replace />} />
        </Routes>
      </Suspense>
    </EmailShell>
  )
}

function EmailShell({ children, mode }) {
  const loc = useLocation()
  const isDeveloperMode = mode === 'developer'

  // Developer mode gets the full tab set. Public (beta) mode hides the
  // conversation shell and the raw pipeline-sync settings — those are
  // developer-only tools that don't make sense for org admins yet.
  const allTabs = [
    { to: '/app/marketing/email', label: 'Dashboard', match: (p) => p === '/app/marketing/email' || p === '/app/marketing/email/' },
    { to: '/app/marketing/email/lists', label: 'Lists' },
    { to: '/app/marketing/email/subscribers', label: 'Subscribers' },
    { to: '/app/marketing/email/campaigns', label: 'Campaigns' },
    { to: '/app/marketing/email/templates', label: 'Templates' },
    { to: '/app/marketing/email/conversations', label: 'Conversations', devOnly: true },
    { to: '/app/marketing/email/sync', label: 'Pipeline Sync', devOnly: true },
    { to: '/app/marketing/email/settings', label: 'Settings' },
  ]
  const tabs = allTabs.filter(t => isDeveloperMode || !t.devOnly)

  const backLink = isDeveloperMode ? '/dev' : '/app'
  const backLabel = isDeveloperMode ? '← /dev' : '← Dashboard'

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="border-b border-border sticky top-0 z-10 bg-bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={backLink} className="text-[10px] text-text-muted hover:text-accent">{backLabel}</Link>
            <h1 className="text-sm font-semibold">Email Marketing</h1>
            {!isDeveloperMode && (
              <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
                Beta
              </span>
            )}
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
      {!isDeveloperMode && (
        <div className="bg-accent/5 border-b border-accent/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 text-[11px] text-text-secondary">
            Email Marketing is in <span className="text-accent font-semibold">early access</span>. Expect rough edges.
            Questions or bugs: <a href="mailto:founder@loud-legacy.com" className="text-accent hover:underline">founder@loud-legacy.com</a>
          </div>
        </div>
      )}
      <main>{children}</main>
    </div>
  )
}

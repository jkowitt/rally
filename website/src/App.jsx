import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { FeatureFlagProvider } from './hooks/useFeatureFlags'
import { ComposeEmailProvider } from './hooks/useComposeEmail'
import { AddonsProvider } from './hooks/useAddons'
import { ImpersonationProvider } from './hooks/useImpersonation'
import ToastProvider from './components/Toast'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LegalGate from './components/layout/LegalGate'
import AppShell from './components/layout/AppShell'
import ErrorBoundary from './components/ErrorBoundary'
import { CMSProvider } from './hooks/useCMS'
import CMSToolbar from './components/cms/CMSToolbar'
import PageEditor from './components/cms/PageEditor'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import QACommentButton from './components/qa/QACommentButton'

// Auto-reload on chunk load failure (stale cache after deploy)
function lazyRetry(fn) {
  return lazy(() => fn().catch(() => {
    window.location.reload()
    return new Promise(() => {}) // never resolves — page will reload
  }))
}

// Lazy-loaded pages — each loads only when navigated to
const LandingPage = lazyRetry(() => import('./pages/LandingPage'))
const LoginPage = lazyRetry(() => import('./modules/legal/LoginPage'))
const ResetPasswordPage = lazyRetry(() => import('./pages/ResetPasswordPage'))
const OutlookOAuthCallback = lazyRetry(() => import('./pages/auth/OutlookOAuthCallback'))
const GmailOAuthCallback = lazyRetry(() => import('./pages/auth/GmailOAuthCallback'))
const InboxView = lazyRetry(() => import('./modules/inbox/InboxView'))
const InboxConnect = lazyRetry(() => import('./modules/inbox/InboxConnect'))
const SignatureSettings = lazyRetry(() => import('./modules/inbox/SignatureSettings'))
const Dashboard = lazyRetry(() => import('./modules/dashboard/Dashboard'))
const AssetCatalog = lazyRetry(() => import('./modules/crm/AssetCatalog'))
const DealPipeline = lazyRetry(() => import('./modules/crm/DealPipeline'))
const ContractManager = lazyRetry(() => import('./modules/crm/ContractManager'))
const SignalFeed = lazyRetry(() => import('./modules/crm/SignalFeed'))
const PriorityQueue = lazyRetry(() => import('./modules/crm/PriorityQueue'))
const Lookalikes = lazyRetry(() => import('./modules/crm/Lookalikes'))
const EnrichmentQueue = lazyRetry(() => import('./modules/crm/EnrichmentQueue'))
const RelationshipSearch = lazyRetry(() => import('./modules/crm/RelationshipSearch'))
const Sequences = lazyRetry(() => import('./modules/crm/Sequences'))
const OutreachAnalytics = lazyRetry(() => import('./modules/crm/OutreachAnalytics'))
const Postmortems = lazyRetry(() => import('./modules/crm/Postmortems'))
const AddonRequests = lazyRetry(() => import('./pages/admin/AddonRequests'))
const SystemHealth = lazyRetry(() => import('./pages/admin/SystemHealth'))
const SalesVelocity = lazyRetry(() => import('./modules/crm/SalesVelocity'))
const Accounts = lazyRetry(() => import('./modules/crm/Accounts'))
const AuditLog = lazyRetry(() => import('./modules/crm/AuditLog'))
const AccountsDashboard = lazyRetry(() => import('./modules/accounts/AccountsDashboard'))
const RenewalPipeline = lazyRetry(() => import('./modules/accounts/RenewalPipeline'))
const AccountDetail = lazyRetry(() => import('./modules/accounts/AccountDetail'))
const BrandReport = lazyRetry(() => import('./modules/crm/BrandReport'))
const DeclinedDeals = lazyRetry(() => import('./modules/crm/DeclinedDeals'))
const ActivityTimeline = lazyRetry(() => import('./modules/crm/ActivityTimeline'))
const TaskManager = lazyRetry(() => import('./modules/crm/TaskManager'))
const DealInsights = lazyRetry(() => import('./modules/crm/DealInsights'))
// Project management
const ProjectList = lazyRetry(() => import('./pages/projects/ProjectList'))
const ProjectDetail = lazyRetry(() => import('./pages/projects/ProjectDetail'))
// User-facing analytics
const SalesDashboard = lazyRetry(() => import('./pages/analytics/SalesDashboard'))
const Newsletter = lazyRetry(() => import('./modules/crm/Newsletter'))
const TeamManager = lazyRetry(() => import('./modules/crm/TeamManager'))
const Automations = lazyRetry(() => import('./modules/crm/Automations'))
const EventManager = lazyRetry(() => import('./modules/sportify/EventManager'))
const EventDetail = lazyRetry(() => import('./modules/sportify/EventDetail'))
const ValuationEngine = lazyRetry(() => import('./modules/valora/ValuationEngine'))
const BusinessNow = lazyRetry(() => import('./modules/businessnow/BusinessNow'))
// Industry-specific modules
const ImpactMetrics = lazyRetry(() => import('./modules/industry/ImpactMetrics'))
const GrantTracker = lazyRetry(() => import('./modules/industry/GrantTracker'))
const DonorPortal = lazyRetry(() => import('./modules/industry/DonorPortal'))
const CampaignCalendar = lazyRetry(() => import('./modules/industry/CampaignCalendar'))
const AudienceAnalytics = lazyRetry(() => import('./modules/industry/AudienceAnalytics'))
const MediaKitBuilder = lazyRetry(() => import('./modules/industry/MediaKitBuilder'))
const OccupancyDashboard = lazyRetry(() => import('./modules/industry/OccupancyDashboard'))
const BrokerNetwork = lazyRetry(() => import('./modules/industry/BrokerNetwork'))
const BookingCalendar = lazyRetry(() => import('./modules/industry/BookingCalendar'))
const CommissionTracker = lazyRetry(() => import('./modules/industry/CommissionTracker'))
const AttendeeAnalytics = lazyRetry(() => import('./modules/industry/AttendeeAnalytics'))
const MultiPropertyView = lazyRetry(() => import('./modules/industry/MultiPropertyView'))
const BusinessOps = lazyRetry(() => import('./modules/businessops/BusinessOps'))
const Settings = lazyRetry(() => import('./modules/crm/Settings'))
const HelpCenter = lazyRetry(() => import('./modules/crm/HelpCenter'))
const CustomDashboardRequest = lazyRetry(() => import('./modules/crm/CustomDashboardRequest'))
const CustomDashboard = lazyRetry(() => import('./modules/crm/CustomDashboard'))
const DeveloperDashboard = lazyRetry(() => import('./modules/developer/DeveloperDashboard'))
const QACommentsReport = lazyRetry(() => import('./pages/developer/QACommentsReport'))
const AutoQAEngine = lazyRetry(() => import('./pages/developer/AutoQAEngine'))
const QARepairPrompts = lazyRetry(() => import('./pages/developer/QARepairPrompts'))
const QATaskManager = lazyRetry(() => import('./modules/developer/QATaskManager'))
const QATestSuite = lazyRetry(() => import('./modules/developer/QATestSuite'))
const QAUsageSimulator = lazyRetry(() => import('./modules/developer/QAUsageSimulator'))
const UsageDashboard = lazyRetry(() => import('./pages/developer/UsageDashboard'))
const DigestAdminList = lazyRetry(() => import('./pages/developer/digest/DigestAdminList'))
const DigestEditor = lazyRetry(() => import('./pages/developer/digest/DigestEditor'))
const SponsorPortal = lazyRetry(() => import('./modules/crm/SponsorPortal'))
const UpgradeOffer = lazyRetry(() => import('./pages/admin/UpgradeOffer'))
const AutomationControl = lazyRetry(() => import('./pages/admin/AutomationControl'))
const EmailQueue = lazyRetry(() => import('./pages/admin/EmailQueue'))
const SocialQueue = lazyRetry(() => import('./pages/admin/SocialQueue'))
const AdminTrials = lazyRetry(() => import('./pages/admin/Trials'))
const AdminAds = lazyRetry(() => import('./pages/admin/Ads'))
const AdminNotifications = lazyRetry(() => import('./pages/admin/Notifications'))
const DailyDigestPreview = lazyRetry(() => import('./pages/admin/DailyDigestPreview'))
const GrowthHub = lazyRetry(() => import('./modules/growth/GrowthHub'))
const OnboardingModal = lazyRetry(() => import('./components/onboarding/OnboardingModal'))
const TooltipTour = lazyRetry(() => import('./components/onboarding/TooltipTour'))
// Private developer-only router — never referenced from any user-facing UI
const DevRouter = lazyRetry(() => import('./pages/dev/DevRouter'))
// Public SEO comparison pages — /compare hub + 6 competitor pages in one chunk
const CompareRouter = lazyRetry(() => import('./pages/compare/CompareRouter'))
// Public database-driven pricing page
const PricingPage = lazyRetry(() => import('./pages/pricing/PricingPage'))
const ManualPage = lazyRetry(() => import('./pages/ManualPage'))
const TodoList = lazyRetry(() => import('./modules/crm/TodoList'))
// Addons + billing settings pages (authenticated)
const AddonsPage = lazyRetry(() => import('./pages/settings/AddonsPage'))
const BillingPage = lazyRetry(() => import('./pages/settings/BillingPage'))
// Public unsubscribe page (no login, token-based)
const UnsubscribePage = lazyRetry(() => import('./pages/email/UnsubscribePage'))
// Public Digest newsletter (archive + individual articles)
const DigestArchive = lazyRetry(() => import('./pages/digest/DigestArchive'))
const DigestArticle = lazyRetry(() => import('./pages/digest/DigestArticle'))
// Internal /email/* email marketing (admin+ with email_marketing_public flag)
const EmailPublicRouter = lazyRetry(() => import('./pages/email/EmailPublicRouter'))
// Email marketing inside the authenticated app shell — shared between
// developers and admin+ users (gated by useEmailMarketingAccess)
const EmailRouter = lazyRetry(() => import('./pages/dev/email/EmailRouter'))
// Hub dashboards — Marketing and Ops aggregate views
const MarketingDashboard = lazyRetry(() => import('./pages/marketing/MarketingDashboard'))
const OpsDashboard = lazyRetry(() => import('./pages/ops/OpsDashboard'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
    </div>
  )
}

// Preserves the :id param when redirecting old /crm/projects/:id to /ops/projects/:id
function RedirectProjectDetail() {
  const { id } = useParams()
  return <Navigate to={`/app/ops/projects/${id}`} replace />
}

export default function App() {
  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // Capture UTM params on first visit for attribution
  useEffect(() => {
    import('./services/utmService').then(({ captureUtmParams }) => captureUtmParams())
  }, [])

  return (
    <ErrorBoundary>
      <ImpersonationProvider>
      <AuthProvider>
        <FeatureFlagProvider>
          <CMSProvider>
          <ToastProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/outlook/callback" element={<OutlookOAuthCallback />} />
            <Route path="/auth/gmail/callback" element={<GmailOAuthCallback />} />
            <Route path="/sponsor/:token" element={<SponsorPortal />} />
            {/* SEO comparison pages (public) */}
            <Route path="/compare/*" element={<CompareRouter />} />
            {/* Public pricing page (database-driven) */}
            <Route path="/pricing" element={<PricingPage />} />
            {/* Public unsubscribe (token-based, no login required) */}
            <Route path="/unsubscribe/:token" element={<UnsubscribePage />} />
            {/* Public Digest archive + individual articles */}
            <Route path="/digest" element={<DigestArchive />} />
            <Route path="/digest/:slug" element={<DigestArticle />} />
            {/* Internal email marketing for admin+ when public flag is ON */}
            <Route path="/email/*" element={<ProtectedRoute><EmailPublicRouter /></ProtectedRoute>} />

            {/* Private developer console — role gate inside DevRouter.
                No navigation links to this path exist anywhere in user UI. */}
            <Route
              path="/dev/*"
              element={
                <ProtectedRoute>
                  <DevRouter />
                </ProtectedRoute>
              }
            />

            {/* Authenticated app */}
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <LegalGate>
                  <ComposeEmailProvider>
                  <AddonsProvider>
                    <AppShell>
                      <Suspense fallback={null}>
                        <OnboardingModal />
                        <TooltipTour />
                      </Suspense>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/manual" element={<ManualPage />} />
                            <Route path="/todo" element={<TodoList />} />
                            {/* CRM */}
                            <Route path="/crm/assets" element={<AssetCatalog />} />
                            <Route path="/crm/pipeline" element={<DealPipeline />} />
                            <Route path="/crm/inbox" element={<InboxView />} />
                            <Route path="/crm/inbox/connect" element={<InboxConnect />} />
                            <Route path="/crm/inbox/signature" element={<SignatureSettings />} />
                            <Route path="/crm/signals" element={<SignalFeed />} />
                            <Route path="/crm/priority" element={<PriorityQueue />} />
                            <Route path="/crm/lookalikes" element={<Lookalikes />} />
                            <Route path="/crm/enrichment-queue" element={<EnrichmentQueue />} />
                            <Route path="/crm/relationships" element={<RelationshipSearch />} />
                            <Route path="/crm/sequences" element={<Sequences />} />
                            <Route path="/crm/outreach-analytics" element={<OutreachAnalytics />} />
                            <Route path="/crm/postmortems" element={<Postmortems />} />
                            <Route path="/crm/velocity" element={<SalesVelocity />} />
                            <Route path="/crm/accounts" element={<Accounts />} />
                            <Route path="/crm/audit" element={<AuditLog />} />
                            <Route path="/crm/contracts" element={<ContractManager />} />
                            <Route path="/crm/report/:dealId" element={<BrandReport />} />
                            <Route path="/crm/declined" element={<DeclinedDeals />} />
                            <Route path="/crm/activities" element={<ActivityTimeline />} />
                            <Route path="/crm/tasks" element={<TaskManager />} />
                            <Route path="/crm/insights" element={<DealInsights />} />
                            <Route path="/crm/analytics" element={<SalesDashboard />} />
                            {/* Operations hub canonical paths */}
                            <Route path="/ops/team" element={<TeamManager />} />
                            <Route path="/ops/newsletter" element={<Newsletter />} />
                            <Route path="/ops/automations" element={<Automations />} />
                            <Route path="/ops/projects" element={<ProjectList />} />
                            <Route path="/ops/projects/:id" element={<ProjectDetail />} />
                            {/* Backwards-compat redirects from old /crm/* paths */}
                            <Route path="/crm/team" element={<Navigate to="/app/ops/team" replace />} />
                            <Route path="/crm/newsletter" element={<Navigate to="/app/ops/newsletter" replace />} />
                            <Route path="/crm/automations" element={<Navigate to="/app/ops/automations" replace />} />
                            <Route path="/crm/projects" element={<Navigate to="/app/ops/projects" replace />} />
                            <Route path="/crm/projects/:id" element={<RedirectProjectDetail />} />
                            {/* Industry-specific modules */}
                            <Route path="/industry/impact" element={<ImpactMetrics />} />
                            <Route path="/industry/grants" element={<GrantTracker />} />
                            <Route path="/industry/donor-portal" element={<DonorPortal />} />
                            <Route path="/industry/campaigns" element={<CampaignCalendar />} />
                            <Route path="/industry/audience" element={<AudienceAnalytics />} />
                            <Route path="/industry/media-kit" element={<MediaKitBuilder />} />
                            <Route path="/industry/occupancy" element={<OccupancyDashboard />} />
                            <Route path="/industry/brokers" element={<BrokerNetwork />} />
                            <Route path="/industry/bookings" element={<BookingCalendar />} />
                            <Route path="/industry/commissions" element={<CommissionTracker />} />
                            <Route path="/industry/attendees" element={<AttendeeAnalytics />} />
                            <Route path="/industry/multi-property" element={<MultiPropertyView />} />
                            {/* Business Ops */}
                            <Route path="/businessops" element={<BusinessOps />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/settings/addons" element={<AddonsPage />} />
                            <Route path="/settings/billing" element={<BillingPage />} />
                            <Route path="/help" element={<HelpCenter />} />
                            <Route path="/custom-dashboard" element={<CustomDashboardRequest />} />
                            <Route path="/custom/:slug" element={<CustomDashboard />} />
                            {/* Activations (legacy /sportify path) */}
                            <Route path="/sportify/events" element={<EventManager />} />
                            <Route path="/sportify/events/:eventId" element={<EventDetail />} />
                            {/* VALORA */}
                            <Route path="/valora" element={<ValuationEngine />} />
                            {/* Business Now */}
                            <Route path="/businessnow" element={<BusinessNow />} />
                            {/* Developer */}
                            <Route path="/developer" element={<DeveloperDashboard />} />
                            <Route path="/developer/qa-comments" element={<QACommentsReport />} />
                            <Route path="/developer/auto-qa" element={<AutoQAEngine />} />
                            <Route path="/developer/repair-prompts" element={<QARepairPrompts />} />
                            <Route path="/developer/qa-tasks" element={<QATaskManager />} />
                            <Route path="/developer/qa-test-suite" element={<QATestSuite />} />
                            <Route path="/developer/qa-usage" element={<QAUsageSimulator />} />
                            <Route path="/developer/digest" element={<DigestAdminList />} />
                            <Route path="/developer/usage" element={<UsageDashboard />} />
                            <Route path="/developer/digest/:id" element={<DigestEditor />} />
                            <Route path="/admin/upgrade-offer" element={<UpgradeOffer />} />
                            <Route path="/admin/automation" element={<AutomationControl />} />
                            <Route path="/admin/email-queue" element={<EmailQueue />} />
                            <Route path="/admin/social-queue" element={<SocialQueue />} />
                            <Route path="/admin/trials" element={<AdminTrials />} />
                            <Route path="/admin/addons" element={<AddonRequests />} />
                            <Route path="/admin/health" element={<SystemHealth />} />
                            <Route path="/admin/ads" element={<AdminAds />} />
                            <Route path="/admin/notifications" element={<AdminNotifications />} />
                            <Route path="/admin/daily-digest" element={<DailyDigestPreview />} />
                            {/* Email Marketing — gated by useEmailMarketingAccess
                                which allows devs + email_marketing_developer OR
                                admin/businessops + email_marketing_public. */}
                            {/* Marketing hub dashboard + email subroutes */}
                            <Route path="/marketing" element={<MarketingDashboard />} />
                            <Route path="/marketing/email/*" element={<EmailRouter />} />
                            {/* Account Management hub */}
                            <Route path="/accounts" element={<AccountsDashboard />} />
                            <Route path="/accounts/renewals" element={<RenewalPipeline />} />
                            <Route path="/accounts/:id" element={<AccountDetail />} />
                            {/* Ops hub dashboard */}
                            <Route path="/ops" element={<OpsDashboard />} />
                            <Route path="/growth" element={<GrowthHub />} />
                            <Route path="*" element={<Navigate to="/app" replace />} />
                          </Routes>
                        </Suspense>
                      </ErrorBoundary>
                    </AppShell>
                  </AddonsProvider>
                  </ComposeEmailProvider>
                  </LegalGate>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <CMSToolbar />
          <PageEditor />
          <PWAInstallPrompt />
          <QACommentButton />
          </Suspense>
          </ToastProvider>
          </CMSProvider>
        </FeatureFlagProvider>
      </AuthProvider>
      </ImpersonationProvider>
    </ErrorBoundary>
  )
}

import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { FeatureFlagProvider } from './hooks/useFeatureFlags'
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
const Dashboard = lazyRetry(() => import('./modules/dashboard/Dashboard'))
const AssetCatalog = lazyRetry(() => import('./modules/crm/AssetCatalog'))
const DealPipeline = lazyRetry(() => import('./modules/crm/DealPipeline'))
const ContractManager = lazyRetry(() => import('./modules/crm/ContractManager'))
const MigratePage = lazyRetry(() => import('./pages/contracts/MigratePage'))
const FulfillmentTracker = lazyRetry(() => import('./modules/crm/FulfillmentTracker'))
const AccountsDashboard = lazyRetry(() => import('./modules/accounts/AccountsDashboard'))
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
const ChecklistWidget = lazyRetry(() => import('./components/onboarding/ChecklistWidget'))
const TooltipTour = lazyRetry(() => import('./components/onboarding/TooltipTour'))
// Private developer-only router — never referenced from any user-facing UI
const DevRouter = lazyRetry(() => import('./pages/dev/DevRouter'))
// Public SEO comparison pages — /compare hub + 6 competitor pages in one chunk
const CompareRouter = lazyRetry(() => import('./pages/compare/CompareRouter'))
// Public database-driven pricing page
const PricingPage = lazyRetry(() => import('./pages/pricing/PricingPage'))
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
                    <AppShell>
                      <Suspense fallback={null}>
                        <OnboardingModal />
                        <ChecklistWidget />
                        <TooltipTour />
                      </Suspense>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            {/* CRM */}
                            <Route path="/crm/assets" element={<AssetCatalog />} />
                            <Route path="/crm/pipeline" element={<DealPipeline />} />
                            <Route path="/crm/contracts" element={<ContractManager />} />
                            <Route path="/crm/migrate" element={<MigratePage />} />
                            <Route path="/crm/fulfillment" element={<FulfillmentTracker />} />
                            <Route path="/crm/report/:dealId" element={<BrandReport />} />
                            <Route path="/crm/projects" element={<ProjectList />} />
                            <Route path="/crm/projects/:id" element={<ProjectDetail />} />
                            <Route path="/crm/declined" element={<DeclinedDeals />} />
                            <Route path="/crm/activities" element={<ActivityTimeline />} />
                            <Route path="/crm/tasks" element={<TaskManager />} />
                            <Route path="/crm/insights" element={<DealInsights />} />
                            <Route path="/crm/analytics" element={<SalesDashboard />} />
                            <Route path="/crm/newsletter" element={<Newsletter />} />
                            <Route path="/crm/team" element={<TeamManager />} />
                            <Route path="/crm/automations" element={<Automations />} />
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
                            {/* Sportify */}
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
                            <Route path="/developer/digest" element={<DigestAdminList />} />
                            <Route path="/developer/digest/:id" element={<DigestEditor />} />
                            <Route path="/admin/upgrade-offer" element={<UpgradeOffer />} />
                            <Route path="/admin/automation" element={<AutomationControl />} />
                            <Route path="/admin/email-queue" element={<EmailQueue />} />
                            <Route path="/admin/social-queue" element={<SocialQueue />} />
                            <Route path="/admin/trials" element={<AdminTrials />} />
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
                            {/* Ops hub dashboard */}
                            <Route path="/ops" element={<OpsDashboard />} />
                            <Route path="/growth" element={<GrowthHub />} />
                            <Route path="*" element={<Navigate to="/app" replace />} />
                          </Routes>
                        </Suspense>
                      </ErrorBoundary>
                    </AppShell>
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

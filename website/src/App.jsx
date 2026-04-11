import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { FeatureFlagProvider } from './hooks/useFeatureFlags'
import ToastProvider from './components/Toast'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LegalGate from './components/layout/LegalGate'
import AppShell from './components/layout/AppShell'
import ErrorBoundary from './components/ErrorBoundary'
import { CMSProvider } from './hooks/useCMS'
import CMSToolbar from './components/cms/CMSToolbar'
import PageEditor from './components/cms/PageEditor'
import PWAInstallPrompt from './components/PWAInstallPrompt'

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
const FulfillmentTracker = lazyRetry(() => import('./modules/crm/FulfillmentTracker'))
const BrandReport = lazyRetry(() => import('./modules/crm/BrandReport'))
const DeclinedDeals = lazyRetry(() => import('./modules/crm/DeclinedDeals'))
const ActivityTimeline = lazyRetry(() => import('./modules/crm/ActivityTimeline'))
const TaskManager = lazyRetry(() => import('./modules/crm/TaskManager'))
const DealInsights = lazyRetry(() => import('./modules/crm/DealInsights'))
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
                            <Route path="/crm/fulfillment" element={<FulfillmentTracker />} />
                            <Route path="/crm/report/:dealId" element={<BrandReport />} />
                            <Route path="/crm/declined" element={<DeclinedDeals />} />
                            <Route path="/crm/activities" element={<ActivityTimeline />} />
                            <Route path="/crm/tasks" element={<TaskManager />} />
                            <Route path="/crm/insights" element={<DealInsights />} />
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
                            <Route path="/admin/upgrade-offer" element={<UpgradeOffer />} />
                            <Route path="/admin/automation" element={<AutomationControl />} />
                            <Route path="/admin/email-queue" element={<EmailQueue />} />
                            <Route path="/admin/social-queue" element={<SocialQueue />} />
                            <Route path="/admin/trials" element={<AdminTrials />} />
                            <Route path="/admin/ads" element={<AdminAds />} />
                            <Route path="/admin/notifications" element={<AdminNotifications />} />
                            <Route path="/admin/daily-digest" element={<DailyDigestPreview />} />
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
          </Suspense>
          </ToastProvider>
          </CMSProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

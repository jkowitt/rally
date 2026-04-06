import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { FeatureFlagProvider } from './hooks/useFeatureFlags'
import ToastProvider from './components/Toast'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LegalGate from './components/layout/LegalGate'
import AppShell from './components/layout/AppShell'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy-loaded pages — each loads only when navigated to
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./modules/legal/LoginPage'))
const Dashboard = lazy(() => import('./modules/dashboard/Dashboard'))
const AssetCatalog = lazy(() => import('./modules/crm/AssetCatalog'))
const DealPipeline = lazy(() => import('./modules/crm/DealPipeline'))
const ContractManager = lazy(() => import('./modules/crm/ContractManager'))
const FulfillmentTracker = lazy(() => import('./modules/crm/FulfillmentTracker'))
const BrandReport = lazy(() => import('./modules/crm/BrandReport'))
const DeclinedDeals = lazy(() => import('./modules/crm/DeclinedDeals'))
const ActivityTimeline = lazy(() => import('./modules/crm/ActivityTimeline'))
const TaskManager = lazy(() => import('./modules/crm/TaskManager'))
const DealInsights = lazy(() => import('./modules/crm/DealInsights'))
const Newsletter = lazy(() => import('./modules/crm/Newsletter'))
const TeamManager = lazy(() => import('./modules/crm/TeamManager'))
const EventManager = lazy(() => import('./modules/sportify/EventManager'))
const EventDetail = lazy(() => import('./modules/sportify/EventDetail'))
const ValuationEngine = lazy(() => import('./modules/valora/ValuationEngine'))
const BusinessNow = lazy(() => import('./modules/businessnow/BusinessNow'))
const Settings = lazy(() => import('./modules/crm/Settings'))
const HelpCenter = lazy(() => import('./modules/crm/HelpCenter'))
const CustomDashboardRequest = lazy(() => import('./modules/crm/CustomDashboardRequest'))
const CustomDashboard = lazy(() => import('./modules/crm/CustomDashboard'))
const DeveloperDashboard = lazy(() => import('./modules/developer/DeveloperDashboard'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FeatureFlagProvider>
          <ToastProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated app */}
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <LegalGate>
                    <AppShell>
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
          </Suspense>
          </ToastProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

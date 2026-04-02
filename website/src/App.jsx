import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { FeatureFlagProvider } from './hooks/useFeatureFlags'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LegalGate from './components/layout/LegalGate'
import AppShell from './components/layout/AppShell'
import LandingPage from './pages/LandingPage'
import LoginPage from './modules/legal/LoginPage'
import Dashboard from './modules/dashboard/Dashboard'
import AssetCatalog from './modules/crm/AssetCatalog'
import DealPipeline from './modules/crm/DealPipeline'
import ContractManager from './modules/crm/ContractManager'
import FulfillmentTracker from './modules/crm/FulfillmentTracker'
import BrandReport from './modules/crm/BrandReport'
import EventManager from './modules/sportify/EventManager'
import EventDetail from './modules/sportify/EventDetail'
import ValuationEngine from './modules/valora/ValuationEngine'
import BusinessNow from './modules/businessnow/BusinessNow'
import DeveloperDashboard from './modules/developer/DeveloperDashboard'

export default function App() {
  return (
    <AuthProvider>
      <FeatureFlagProvider>
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
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      {/* CRM */}
                      <Route path="/crm/assets" element={<AssetCatalog />} />
                      <Route path="/crm/pipeline" element={<DealPipeline />} />
                      <Route path="/crm/contracts" element={<ContractManager />} />
                      <Route path="/crm/fulfillment" element={<FulfillmentTracker />} />
                      <Route path="/crm/report/:dealId" element={<BrandReport />} />
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
                  </AppShell>
                </LegalGate>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </FeatureFlagProvider>
    </AuthProvider>
  )
}

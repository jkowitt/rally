import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DeveloperOnly from '@/components/dev/DeveloperOnly'
import { useAuth } from '@/hooks/useAuth'

// All dev pages are lazy-loaded so no code ships to non-developer bundles
// beyond this tiny router shell (and even this shell is only loaded when
// /dev/* is visited).
const DevConsole = lazy(() => import('./DevConsole'))
const DevFeatureFlags = lazy(() => import('./DevFeatureFlags'))
const OutlookConnect = lazy(() => import('./outlook/OutlookConnect'))
const OutlookCallback = lazy(() => import('./outlook/OutlookCallback'))
const OutlookDashboard = lazy(() => import('./outlook/OutlookDashboard'))
const OutlookOutreach = lazy(() => import('./outlook/OutlookOutreach'))
const FollowUpQueue = lazy(() => import('./outlook/FollowUpQueue'))
const EmailTemplates = lazy(() => import('./outlook/EmailTemplates'))
const OutlookAnalytics = lazy(() => import('./outlook/OutlookAnalytics'))

// Email marketing — role-gated at router + flag-gated per route
const EmailRouter = lazy(() => import('./email/EmailRouter'))
// Pricing control center — developer-only, no flag gate (always available)
const PricingControlCenter = lazy(() => import('./pricing/PricingControlCenter'))

/**
 * Private developer router. Every child route is wrapped in
 * DeveloperOnly which redirects silently to /app if the user is
 * not the developer role OR the outlook_integration flag is OFF.
 *
 * The one exception: /dev/feature-flags is reachable with the flag
 * still OFF — it's the console where the developer toggles it on.
 * That page gates on role only, not the flag.
 */
export default function DevRouter() {
  const { profile, loading } = useAuth()

  // Hard role gate at the router level. Non-developers get bounced
  // before any lazy chunk is even fetched.
  if (loading) return null
  if (profile?.role !== 'developer') {
    return <Navigate to="/app" replace />
  }

  return (
    <Suspense fallback={null}>
      <Routes>
        {/* Role-only gates (flag not required) */}
        <Route path="/feature-flags" element={<DevFeatureFlags />} />
        <Route path="/" element={<DevConsole />} />

        {/* Outlook integration — role + flag gated */}
        <Route path="/outlook/connect" element={<DeveloperOnly><OutlookConnect /></DeveloperOnly>} />
        <Route path="/outlook/callback" element={<DeveloperOnly><OutlookCallback /></DeveloperOnly>} />
        <Route path="/outlook/dashboard" element={<DeveloperOnly><OutlookDashboard /></DeveloperOnly>} />
        <Route path="/outlook/outreach" element={<DeveloperOnly><OutlookOutreach /></DeveloperOnly>} />
        <Route path="/outlook/follow-ups" element={<DeveloperOnly><FollowUpQueue /></DeveloperOnly>} />
        <Route path="/outlook/templates" element={<DeveloperOnly><EmailTemplates /></DeveloperOnly>} />
        <Route path="/outlook/analytics" element={<DeveloperOnly><OutlookAnalytics /></DeveloperOnly>} />

        {/* Email marketing — flag gated inside EmailRouter */}
        <Route path="/email/*" element={<EmailRouter />} />

        {/* Pricing control center — developer-only, no flag gate */}
        <Route path="/pricing/*" element={<PricingControlCenter />} />

        {/* Silent 404 — never reveal route existence */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Suspense>
  )
}

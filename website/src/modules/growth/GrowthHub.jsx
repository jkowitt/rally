import { useState, lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'

// Reuse existing Business Ops components — they're already built
// They pull from biz_* tables which now have proper RLS per migration 052
const AdSpendManager = lazy(() => import('@/modules/businessops/AdSpendManager'))
const GoalTracker = lazy(() => import('@/modules/businessops/GoalTracker'))
const ConnectionManager = lazy(() => import('@/modules/businessops/ConnectionManager'))
const FinancialProjections = lazy(() => import('@/modules/businessops/FinancialProjections'))
const FinanceDashboard = lazy(() => import('@/modules/businessops/FinanceDashboard'))
const ReportBuilder = lazy(() => import('@/modules/businessops/ReportBuilder'))

// New modules built specifically for growth hub
const GrowthWorkbook = lazy(() => import('./GrowthWorkbook'))
const StrategicWorkbooks = lazy(() => import('./StrategicWorkbooks'))

export default function GrowthHub() {
  const { profile } = useAuth()
  const { flags, loaded } = useFeatureFlags()
  const [tab, setTab] = useState('')

  // Master gate: client_growth_hub must be ON
  if (loaded && !flags.client_growth_hub) {
    return <Navigate to="/app" replace />
  }

  // Build tab list dynamically based on enabled flags
  const availableTabs = [
    flags.client_growth_workbook && { id: 'workbook', label: 'Where You Are', component: GrowthWorkbook, icon: '🧭' },
    flags.client_strategic_workbooks && { id: 'workbooks', label: 'Workbooks', component: StrategicWorkbooks, icon: '📚' },
    flags.client_ad_spend && { id: 'ads', label: 'Ad Spend', component: AdSpendManager, icon: '💰' },
    flags.client_financial_projections && { id: 'projections', label: 'Projections', component: FinancialProjections, icon: '📈' },
    flags.client_finance_dashboard && { id: 'finance', label: 'Finance', component: FinanceDashboard, icon: '💳' },
    flags.client_goal_tracker && { id: 'goals', label: 'Goals', component: GoalTracker, icon: '🎯' },
    flags.client_connection_manager && { id: 'connections', label: 'Connections', component: ConnectionManager, icon: '🤝' },
    flags.client_report_builder && { id: 'reports', label: 'AI Reports', component: ReportBuilder, icon: '📊' },
  ].filter(Boolean)

  // Default to first available tab
  const currentTab = tab || availableTabs[0]?.id || ''
  const ActiveComponent = availableTabs.find(t => t.id === currentTab)?.component

  if (availableTabs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3 max-w-md">
          <div className="text-4xl">🚧</div>
          <h2 className="text-lg font-semibold text-text-primary">Growth Tools are coming soon</h2>
          <p className="text-xs text-text-secondary">Your account has access to the Growth Hub, but no individual tools have been enabled yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Growth Tools</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">Strategic tools to grow your business — financial modeling, marketing playbooks, workbooks, and AI reports.</p>
      </div>

      {/* Tab navigation — mobile dropdown, desktop buttons */}
      <div className="sm:hidden">
        <select value={currentTab} onChange={e => setTab(e.target.value)} className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
          {availableTabs.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
      </div>
      <div className="hidden sm:flex gap-1 bg-bg-card rounded-lg p-1 overflow-x-auto">
        {availableTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${currentTab === t.id ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <span className="mr-1">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <Suspense fallback={<div className="text-center text-text-muted text-sm py-8">Loading...</div>}>
        {ActiveComponent && <ActiveComponent />}
      </Suspense>
    </div>
  )
}

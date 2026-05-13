import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import RevenuePipeline from './RevenuePipeline'
import GoalTracker from './GoalTracker'
import FinanceDashboard from './FinanceDashboard'
import FinancialProjections from './FinancialProjections'
import AdSpendManager from './AdSpendManager'
import ReportBuilder from './ReportBuilder'
import ConnectionManager from './ConnectionManager'
import RoadmapTracker from './RoadmapTracker'
import QATickets from './QATickets'
import Accounting from './Accounting'
import MarketingHub from './MarketingHub'

const TABS = [
  { id: 'pipeline', label: 'Revenue Pipeline' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'projections', label: '5-Year Projections' },
  { id: 'ads', label: 'Ad Spend' },
  { id: 'goals', label: 'Goals' },
  { id: 'finance', label: 'Finance' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'reports', label: 'Reports' },
  { id: 'qa', label: 'QA Tickets' },
  { id: 'connections', label: 'Connections' },
  { id: 'roadmap', label: 'Roadmap' },
]

export default function BusinessOps() {
  const { profile, realIsDeveloper } = useAuth()
  const [tab, setTab] = useState('pipeline')

  // Real developer always has access; businessops role does too.
  // Using realIsDeveloper means the dev keeps access while impersonating
  // a different role.
  const hasAccess = realIsDeveloper || profile?.role === 'businessops'
  if (!hasAccess) return <Navigate to="/app" replace />

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Business Ops</h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">Internal operations for Loud CRM</p>
      </div>

      {/* Mobile: dropdown, Desktop: tabs */}
      <div className="sm:hidden">
        <select value={tab} onChange={e => setTab(e.target.value)} className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
          {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div className="hidden sm:flex gap-1 bg-bg-card rounded-lg p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && <RevenuePipeline />}
      {tab === 'marketing' && <MarketingHub />}
      {tab === 'projections' && <FinancialProjections />}
      {tab === 'ads' && <AdSpendManager />}
      {tab === 'goals' && <GoalTracker />}
      {tab === 'finance' && <FinanceDashboard />}
      {tab === 'reports' && <ReportBuilder />}
      {tab === 'accounting' && <Accounting />}
      {tab === 'qa' && <QATickets />}
      {tab === 'connections' && <ConnectionManager />}
      {tab === 'roadmap' && <RoadmapTracker />}
    </div>
  )
}

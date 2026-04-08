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
import ClaudeTerminal from './ClaudeTerminal'
import RoadmapTracker from './RoadmapTracker'
import QATickets from './QATickets'
import Accounting from './Accounting'

const TABS = [
  { id: 'pipeline', label: 'Revenue Pipeline' },
  { id: 'projections', label: '5-Year Projections' },
  { id: 'ads', label: 'Ad Spend' },
  { id: 'goals', label: 'Goals' },
  { id: 'finance', label: 'Finance' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'reports', label: 'Reports' },
  { id: 'qa', label: 'QA Tickets' },
  { id: 'connections', label: 'Connections' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'claude', label: 'Claude Code' },
]

export default function BusinessOps() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('pipeline')

  // Only developer and businessops can access
  const hasAccess = profile?.role === 'developer' || profile?.role === 'businessops'
  if (!hasAccess) return <Navigate to="/app" replace />

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Business Ops</h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">Internal operations for Loud Legacy</p>
      </div>

      <div className="flex gap-1 bg-bg-card rounded-lg p-1 overflow-x-auto">
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
      {tab === 'projections' && <FinancialProjections />}
      {tab === 'ads' && <AdSpendManager />}
      {tab === 'goals' && <GoalTracker />}
      {tab === 'finance' && <FinanceDashboard />}
      {tab === 'reports' && <ReportBuilder />}
      {tab === 'accounting' && <Accounting />}
      {tab === 'qa' && <QATickets />}
      {tab === 'connections' && <ConnectionManager />}
      {tab === 'roadmap' && <RoadmapTracker />}
      {tab === 'claude' && <ClaudeTerminal />}
    </div>
  )
}

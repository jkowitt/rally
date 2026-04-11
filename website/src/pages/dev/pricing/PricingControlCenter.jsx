import { useEffect, useState } from 'react'
import { Link, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import * as pricingService from '@/services/pricingService'
import * as stripeSync from '@/services/stripeSyncService'

// Tabs
import PlansTab from './PlansTab'
import LimitsTab from './LimitsTab'
import FeaturesTab from './FeaturesTab'
import AICreditsTab from './AICreditsTab'
import AddonsTab from './AddonsTab'
import PricingPageTab from './PricingPageTab'
import HistoryTab from './HistoryTab'

/**
 * /dev/pricing — the full pricing control center.
 *
 * Developer-only. Guarded in DevRouter but we double-check here and
 * silent-redirect to /app if the role check fails for any reason.
 */
export default function PricingControlCenter() {
  const { profile } = useAuth()
  if (profile?.role !== 'developer') return <Navigate to="/app" replace />

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <WarningBanner />
        <StatsBar />
        <StripeHealth />
        <TabNav />
        <div className="mt-5">
          <Routes>
            <Route index element={<PlansTab />} />
            <Route path="plans" element={<PlansTab />} />
            <Route path="limits" element={<LimitsTab />} />
            <Route path="features" element={<FeaturesTab />} />
            <Route path="ai-credits" element={<AICreditsTab />} />
            <Route path="addons" element={<AddonsTab />} />
            <Route path="page" element={<PricingPageTab />} />
            <Route path="history" element={<HistoryTab />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
          <h1 className="text-xl font-semibold mt-1">Pricing Control Center</h1>
          <p className="text-[11px] text-text-muted">
            Adjust all pricing, limits, credits, and addons in real time.
            Changes take effect immediately for new customers.
          </p>
        </div>
      </div>
    </header>
  )
}

function WarningBanner() {
  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4 text-xs">
      <strong className="text-warning">⚠ Live changes</strong>
      <span className="text-text-secondary ml-2">
        Changes here affect the live product within 5 minutes (cache TTL).
        There is no staging for pricing. Test with a developer account first.
      </span>
    </div>
  )
}

function StatsBar() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    pricingService.getControlCenterStats().then(setStats)
  }, [])
  if (!stats) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
      <Stat label="Paying customers" value={stats.payingCustomers} />
      <Stat label="MRR" value={`$${stats.mrr.toFixed(0)}`} color="accent" />
      <Stat label="ARPU" value={`$${stats.arpu.toFixed(0)}`} />
      <Stat label="Active addons" value={stats.activeAddons} />
      <Stat label="Annual %" value={`${stats.annualPct}%`} />
    </div>
  )
}

function Stat({ label, value, color = 'primary' }) {
  const cls = color === 'accent' ? 'text-accent' : 'text-text-primary'
  return (
    <div className="bg-bg-card border border-border rounded p-2">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function StripeHealth() {
  const [health, setHealth] = useState(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    stripeSync.verifyStripeAlignment().then(setHealth)
  }, [])

  async function handleSyncAll() {
    if (!confirm('Sync all plans, addons, and credit packs to Stripe?')) return
    setSyncing(true)
    const r = await stripeSync.syncAllToStripe()
    setSyncing(false)
    if (r.success) {
      alert('Sync complete')
      stripeSync.verifyStripeAlignment().then(setHealth)
    } else {
      alert(`Sync failed: ${r.error}`)
    }
  }

  if (!health) return null
  const color = health.healthy ? 'success' : 'warning'
  return (
    <div className={`bg-${color}/10 border border-${color}/30 rounded-lg p-3 mb-4 flex items-center justify-between`}>
      <div className="text-xs">
        <strong className={`text-${color}`}>{health.healthy ? '✓ Stripe healthy' : `⚠ ${health.issues.length} Stripe issue${health.issues.length !== 1 ? 's' : ''}`}</strong>
        {!health.healthy && (
          <div className="text-[10px] text-text-muted mt-1">
            {health.issues.slice(0, 3).map((i, idx) => <div key={idx}>• {i.type}:{i.key} — {i.message}</div>)}
          </div>
        )}
      </div>
      <button onClick={handleSyncAll} disabled={syncing} className="text-[10px] border border-border px-2 py-1 rounded hover:border-accent/50 disabled:opacity-50">
        {syncing ? 'Syncing…' : 'Sync all to Stripe'}
      </button>
    </div>
  )
}

function TabNav() {
  const tabs = [
    { to: '/dev/pricing/plans', label: 'Plans' },
    { to: '/dev/pricing/limits', label: 'Limits' },
    { to: '/dev/pricing/features', label: 'Features' },
    { to: '/dev/pricing/ai-credits', label: 'AI Credits' },
    { to: '/dev/pricing/addons', label: 'Addons' },
    { to: '/dev/pricing/page', label: 'Pricing Page' },
    { to: '/dev/pricing/history', label: 'History' },
  ]
  return (
    <nav className="flex gap-1 border-b border-border overflow-x-auto">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/dev/pricing'}
          className={({ isActive }) =>
            `px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${isActive ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

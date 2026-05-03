import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Card, EmptyState } from '@/components/ui'

export default function AccountsDashboard() {
  const { profile } = useAuth()
  const propertyId = profile?.property_id
  const [stats, setStats] = useState({
    contracts: 0,
    activeContracts: 0,
    archivedContracts: 0,
    benefits: 0,
    delivered: 0,
    pending: 0,
  })
  const [recentContracts, setRecentContracts] = useState([])
  const [recentVersions, setRecentVersions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!propertyId) return
    let cancelled = false

    async function load() {
      setLoading(true)

      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, deal_id, file_name, created_at, status, archived_at, deals(brand_name)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(50)

      const all = contracts || []
      const active = all.filter(c => !c.archived_at)
      const archived = all.filter(c => !!c.archived_at)

      const { data: records } = await supabase
        .from('fulfillment_records')
        .select('id, delivered, contract_id')
        .in('contract_id', all.map(c => c.id).filter(Boolean))

      const recList = records || []
      const delivered = recList.filter(r => r.delivered).length
      const pending = recList.length - delivered

      const { data: versions } = await supabase
        .from('contract_versions')
        .select('id, contract_id, version_number, archived_at, archived_reason, snapshot')
        .eq('property_id', propertyId)
        .order('archived_at', { ascending: false })
        .limit(5)

      if (cancelled) return
      setStats({
        contracts: all.length,
        activeContracts: active.length,
        archivedContracts: (versions || []).length > 0 ? (versions || []).length : archived.length,
        benefits: recList.length,
        delivered,
        pending,
      })
      setRecentContracts(active.slice(0, 8))
      setRecentVersions(versions || [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [propertyId])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Account Management' },
      ]} />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Account Management</h1>
        <p className="text-sm text-text-muted mt-1">
          Signed contracts, parsed benefits, and fulfillment status across all active accounts.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Active Contracts" value={stats.activeContracts} loading={loading} />
        <StatCard label="Archived Versions" value={stats.archivedContracts} loading={loading} />
        <StatCard label="Total Benefits" value={stats.benefits} loading={loading} />
        <StatCard label="Delivered" value={stats.delivered} loading={loading} accent="success" />
        <StatCard label="Pending" value={stats.pending} loading={loading} accent="warning" />
        <StatCard
          label="Fulfillment %"
          value={stats.benefits ? Math.round((stats.delivered / stats.benefits) * 100) + '%' : '—'}
          loading={loading}
          accent="accent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/app/crm/contracts"
          className="block rounded-lg bg-bg-surface border border-border p-5 hover:border-accent/40 transition-colors"
        >
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Manage</div>
          <div className="text-lg font-semibold text-text-primary">Contracts</div>
          <div className="text-sm text-text-muted mt-2">
            Upload, view, parse benefits, and archive prior versions.
          </div>
        </Link>
        <Link
          to="/app/crm/fulfillment"
          className="block rounded-lg bg-bg-surface border border-border p-5 hover:border-accent/40 transition-colors"
        >
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Track</div>
          <div className="text-lg font-semibold text-text-primary">Fulfillment</div>
          <div className="text-sm text-text-muted mt-2">
            Status of every benefit promised in every signed contract.
          </div>
        </Link>
      </div>

      <section>
        <div className="text-xs uppercase tracking-widest text-text-muted mb-2">
          Recent Active Contracts
        </div>
        <Card padding="none" className="divide-y divide-border overflow-hidden">
          {loading && (
            <ul className="divide-y divide-border" aria-label="Loading recent contracts">
              {[0, 1, 2].map(i => (
                <li key={i} className="p-3 flex items-center justify-between">
                  <div className="space-y-1.5 flex-1 mr-4">
                    <div className="h-3 w-1/2 bg-bg-card rounded" />
                    <div className="h-2 w-1/3 bg-bg-card/60 rounded" />
                  </div>
                  <span className="w-10 h-3 bg-bg-card rounded" />
                </li>
              ))}
            </ul>
          )}
          {!loading && recentContracts.length === 0 && (
            <EmptyState
              title="No active contracts yet"
              description="Sign a deal in the CRM and the contract will land here automatically — benefits parsed, fulfillment tracked, archives kept on every update."
              className="border-0"
            />
          )}
          {!loading && recentContracts.map(c => (
            <Link
              key={c.id}
              to="/app/crm/contracts"
              className="flex items-center justify-between p-3 hover:bg-bg-card transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {c.deals?.brand_name || c.file_name || 'Untitled contract'}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {new Date(c.created_at).toLocaleDateString()} · {c.status || 'active'}
                </div>
              </div>
              <span className="text-xs text-accent">View →</span>
            </Link>
          ))}
        </Card>
      </section>

      {recentVersions.length > 0 && (
        <section>
          <div className="text-xs uppercase tracking-widest text-text-muted mb-2">
            Recent Archived Versions
          </div>
          <Card padding="none" className="divide-y divide-border overflow-hidden">
            {recentVersions.map(v => {
              const snap = v.snapshot?.contract || {}
              return (
                <div key={v.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm text-text-primary">
                      {snap.brand_name || 'Contract'} <span className="text-text-muted">— v{v.version_number}</span>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Archived {new Date(v.archived_at).toLocaleDateString()}
                      {v.archived_reason ? ` · ${v.archived_reason}` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value, loading, accent }) {
  const accentClass =
    accent === 'success' ? 'text-success' :
    accent === 'warning' ? 'text-warning' :
    accent === 'accent' ? 'text-accent' :
    'text-text-primary'
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-2xl font-semibold mt-1 font-mono ${accentClass}`}>
        {loading ? '…' : value}
      </div>
    </Card>
  )
}

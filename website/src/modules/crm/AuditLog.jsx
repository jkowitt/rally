import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Card, EmptyState, Badge } from '@/components/ui'
import { ScrollText, Plus, Pencil, Trash2 } from 'lucide-react'

const TABLE_LABEL = { deals: 'Deal', contacts: 'Contact', contracts: 'Contract' }
const ACTION_TONE = { insert: 'success', update: 'accent', delete: 'danger' }
const ACTION_ICON = { insert: Plus, update: Pencil, delete: Trash2 }

// AuditLog — read-only view of audit_events. Filterable by table,
// action, and (optionally) the row id. Each event renders the
// changed fields with old → new diff.
export default function AuditLog() {
  const { profile } = useAuth()
  const [tableFilter, setTableFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['audit-events', profile?.property_id, tableFilter, actionFilter],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      let q = supabase
        .from('audit_events')
        .select('*, profiles:changed_by(full_name, email)')
        .eq('property_id', profile.property_id)
        .order('occurred_at', { ascending: false })
        .limit(200)
      if (tableFilter !== 'all') q = q.eq('table_name', tableFilter)
      if (actionFilter !== 'all') q = q.eq('action', actionFilter)
      const { data } = await q
      return data || []
    },
  })

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'CRM & Prospecting', to: '/app' }, { label: 'Audit Log' }]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-accent" />
          Audit Log
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Every change to deals, contacts, and contracts. Last 200 events.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All tables' },
          { id: 'deals', label: 'Deals' },
          { id: 'contacts', label: 'Contacts' },
          { id: 'contracts', label: 'Contracts' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setTableFilter(opt.id)}
            className={`px-2.5 py-1 rounded text-xs font-medium border ${tableFilter === opt.id ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-card border-border text-text-muted hover:text-text-primary'}`}
          >
            {opt.label}
          </button>
        ))}
        <span className="w-px h-6 bg-border" />
        {[
          { id: 'all', label: 'All actions' },
          { id: 'insert', label: 'Created' },
          { id: 'update', label: 'Updated' },
          { id: 'delete', label: 'Deleted' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setActionFilter(opt.id)}
            className={`px-2.5 py-1 rounded text-xs font-medium border ${actionFilter === opt.id ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-card border-border text-text-muted hover:text-text-primary'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-sm text-text-muted">Loading…</div>}

      {!isLoading && rows.length === 0 && (
        <EmptyState
          icon={<ScrollText className="w-7 h-7 text-text-muted" />}
          title="No events yet"
          description="When deals, contacts, or contracts change, the diff lands here."
        />
      )}

      <ul className="space-y-2">
        {rows.map(r => <AuditRow key={r.id} row={r} />)}
      </ul>
    </div>
  )
}

function AuditRow({ row }) {
  const Icon = ACTION_ICON[row.action] || Pencil
  const author = row.profiles?.full_name || row.profiles?.email || 'Unknown'
  const tableLabel = TABLE_LABEL[row.table_name] || row.table_name
  const changes = row.changes || {}
  const diffEntries = row.action === 'update'
    ? Object.entries(changes).filter(([k]) => !['updated_at', 'last_synced_at', 'last_enriched_at', 'created_at'].includes(k))
    : []

  return (
    <Card padding="md" className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Icon className="w-4 h-4 text-text-muted" />
        <Badge tone={ACTION_TONE[row.action] || 'neutral'}>{row.action}</Badge>
        <span className="text-sm text-text-primary">{tableLabel}</span>
        {row.table_name === 'deals' && (
          <Link to={`/app/crm/pipeline?deal=${row.row_id}`} className="text-xs text-accent hover:underline">{row.row_id.slice(0, 8)}</Link>
        )}
        <span className="text-xs text-text-muted">by {author}</span>
        <span className="text-[11px] text-text-muted font-mono ml-auto">
          {new Date(row.occurred_at).toLocaleString()}
        </span>
      </div>

      {row.action === 'update' && diffEntries.length > 0 && (
        <div className="bg-bg-card border border-border rounded p-2 text-xs space-y-1">
          {diffEntries.slice(0, 8).map(([k, v]) => (
            <div key={k} className="font-mono">
              <span className="text-text-muted">{k}:</span>{' '}
              <span className="text-danger line-through">{stringify(v?.old)}</span>{' '}
              <span className="text-text-muted">→</span>{' '}
              <span className="text-success">{stringify(v?.new)}</span>
            </div>
          ))}
          {diffEntries.length > 8 && (
            <div className="text-[10px] text-text-muted">+ {diffEntries.length - 8} more fields…</div>
          )}
        </div>
      )}

      {row.action === 'insert' && changes.brand_name && (
        <div className="text-xs text-text-secondary">{changes.brand_name}{changes.value ? ` · $${Number(changes.value).toLocaleString()}` : ''}</div>
      )}
    </Card>
  )
}

function stringify(v) {
  if (v == null) return '∅'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60)
  const s = String(v)
  return s.length > 60 ? s.slice(0, 60) + '…' : s
}

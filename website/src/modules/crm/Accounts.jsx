import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { Building, Plus, Trash2, Briefcase } from 'lucide-react'
import AccountHealthBadge from '@/components/AccountHealthBadge'

// Accounts — the parent-company layer. Each row rolls up open
// pipeline + won value across all child deals (account_pipeline_summary
// view in 077). Two tabs: Accounts and Agencies (separate model).
export default function Accounts() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('accounts')

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'CRM & Prospecting', to: '/app' }, { label: 'Accounts' }]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Building className="w-6 h-6 text-accent" />
          Accounts
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Parent companies + agencies. Roll up many brand deals to one relationship.
        </p>
      </div>

      <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit">
        <button onClick={() => setTab('accounts')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'accounts' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>Accounts</button>
        <button onClick={() => setTab('agencies')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'agencies' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>Agencies</button>
      </div>

      {tab === 'accounts' && <AccountsTab propertyId={profile?.property_id} />}
      {tab === 'agencies' && <AgenciesTab propertyId={profile?.property_id} />}
    </div>
  )
}

function AccountsTab({ propertyId }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)

  const { data: rows = [] } = useQuery({
    queryKey: ['accounts-summary', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('account_pipeline_summary')
        .select('*')
        .eq('property_id', propertyId)
        .order('open_pipeline_value', { ascending: false, nullsFirst: false })
      return data || []
    },
  })

  // Bulk-load health scores once for all accounts on the page so
  // each row doesn't fire its own query.
  const { data: healthByAccount = {} } = useQuery({
    queryKey: ['accounts-health-bulk', propertyId],
    enabled: !!propertyId && rows.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('account_health_score')
        .select('*')
        .eq('property_id', propertyId)
      const byId = {}
      for (const r of (data || [])) byId[r.account_id] = r
      return byId
    },
  })

  const create = useMutation({
    mutationFn: async (form) => {
      const { error } = await supabase.from('accounts').insert({ property_id: propertyId, ...form })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts-summary', propertyId] })
      setAdding(false)
      toast({ title: 'Account created', type: 'success' })
    },
    onError: (e) => toast({ title: 'Could not create', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts-summary', propertyId] }),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-muted">{rows.length} accounts</span>
        {!adding && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" /> New account
          </Button>
        )}
      </div>

      {adding && (
        <AccountForm
          onCancel={() => setAdding(false)}
          onSave={(form) => create.mutate(form)}
          saving={create.isPending}
        />
      )}

      {rows.length === 0 && !adding && (
        <EmptyState
          title="No accounts yet"
          description="Create a parent company (e.g. Coca-Cola) and link multiple deals to it."
          primaryAction={<Button size="sm" onClick={() => setAdding(true)}>+ First account</Button>}
        />
      )}

      <ul className="space-y-2">
        {rows.map(a => (
          <Card key={a.account_id} padding="md" className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/app/accounts/${a.account_id}`} className="text-sm font-semibold text-text-primary hover:text-accent">
                  {a.name}
                </Link>
                <AccountHealthBadge accountId={a.account_id} health={healthByAccount[a.account_id]} />
                <Badge tone="info">{a.total_deals || 0} deal{a.total_deals === 1 ? '' : 's'}</Badge>
                {a.won_deals > 0 && <Badge tone="success">{a.won_deals} won</Badge>}
              </div>
              <div className="flex gap-3 mt-1 text-[11px] text-text-muted font-mono">
                {a.open_pipeline_value > 0 && <span>${Number(a.open_pipeline_value).toLocaleString()} open pipeline</span>}
                {a.won_value > 0 && <span className="text-success">${Number(a.won_value).toLocaleString()} won</span>}
                {a.last_activity_at && <span>last activity {new Date(a.last_activity_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <button onClick={() => { if (confirm(`Delete ${a.name}? Linked deals will be unlinked.`)) remove.mutate(a.account_id) }} className="text-text-muted hover:text-danger p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Card>
        ))}
      </ul>
    </div>
  )
}

function AccountForm({ onCancel, onSave, saving }) {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  return (
    <Card padding="md" className="space-y-2 border-accent/30">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name (e.g. Coca-Cola Co.)" autoFocus
             className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
      <div className="grid grid-cols-2 gap-2">
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website"
               className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
        <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry"
               className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={!name.trim() || saving}
                onClick={() => onSave({ name: name.trim(), website: website || null, industry: industry || null })}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </Card>
  )
}

function AgenciesTab({ propertyId }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')

  const { data: rows = [] } = useQuery({
    queryKey: ['agencies', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase.from('agencies').select('*').eq('property_id', propertyId).order('name')
      return data || []
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('agencies').insert({
        property_id: propertyId,
        name: name.trim(),
        website: website || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agencies', propertyId] })
      setAdding(false); setName(''); setWebsite('')
      toast({ title: 'Agency added', type: 'success' })
    },
    onError: (e) => toast({ title: 'Save failed', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('agencies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agencies', propertyId] }),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-muted">{rows.length} agencies</span>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" /> New agency</Button>}
      </div>
      {adding && (
        <Card padding="md" className="space-y-2 border-accent/30">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agency name (e.g. Wieden+Kennedy)" autoFocus
                   className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website"
                   className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </Card>
      )}
      {rows.length === 0 && !adding && (
        <EmptyState
          title="No agencies yet"
          description="Track third-party agencies that represent multiple brands."
        />
      )}
      <ul className="space-y-2">
        {rows.map(a => (
          <Card key={a.id} padding="md" className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-text-primary">{a.name}</span>
              {a.website && <a href={a.website.startsWith('http') ? a.website : `https://${a.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent hover:underline">{a.website}</a>}
            </div>
            <button onClick={() => { if (confirm(`Delete ${a.name}?`)) remove.mutate(a.id) }} className="text-text-muted hover:text-danger p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Card>
        ))}
      </ul>
    </div>
  )
}

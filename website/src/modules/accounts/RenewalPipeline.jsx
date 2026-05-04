import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { Repeat, AlertTriangle, Clock, CheckCircle, Zap } from 'lucide-react'

const BAND_TONE = {
  Expired: 'danger',
  Critical: 'danger',
  Soon: 'warning',
  Upcoming: 'accent',
  Future: 'neutral',
}

// RenewalPipeline — every signed contract approaching expiration,
// sorted by days remaining. The whole CSM job is renewals; this is
// where they live each morning. Reads from renewal_pipeline view (079).
export default function RenewalPipeline() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [bandFilter, setBandFilter] = useState('all')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['renewal-pipeline', profile?.property_id, bandFilter],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      let q = supabase
        .from('renewal_pipeline')
        .select('*')
        .eq('property_id', profile.property_id)
        .order('days_remaining', { ascending: true })
        .limit(200)
      if (bandFilter !== 'all') q = q.eq('renewal_band', bandFilter)
      const { data } = await q
      return data || []
    },
  })

  // Counts per band for the filter chips.
  const counts = rows.reduce((acc, r) => { acc[r.renewal_band] = (acc[r.renewal_band] || 0) + 1; return acc }, {})

  // Start a renewal cadence on the contract's primary contact.
  const startRenewal = useMutation({
    mutationFn: async (row) => {
      // 1. Ensure the renewal sequence exists for this property.
      const { data: seqId, error: seqErr } = await supabase.rpc('ensure_renewal_sequence', {
        p_property_id: profile.property_id,
      })
      if (seqErr) throw seqErr

      // 2. Find the primary contact for this deal.
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('deal_id', row.deal_id)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!contact?.id) throw new Error('No contacts on this deal — add one before starting a renewal cadence.')

      // 3. Enroll. Idempotent on (sequence_id, contact_id).
      const { error: enrErr } = await supabase
        .from('prospect_sequence_enrollments')
        .insert({
          sequence_id: seqId,
          property_id: profile.property_id,
          contact_id: contact.id,
          deal_id: row.deal_id,
          enrolled_by: profile.id,
          current_step: 0,
          next_send_at: new Date().toISOString(),
        })
      if (enrErr && enrErr.code !== '23505') throw enrErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['renewal-pipeline'] })
      toast({ title: 'Renewal cadence started', description: 'First touch fires within 15 minutes.', type: 'success' })
    },
    onError: (e) => toast({ title: 'Could not start cadence', description: humanError(e), type: 'error' }),
  })

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Account Management', to: '/app/accounts' },
        { label: 'Renewal Pipeline' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Repeat className="w-6 h-6 text-accent" />
          Renewal Pipeline
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Every signed contract within 90 days of expiry. Start cadences early — renewal motion compounds.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all',      label: 'All' },
          { id: 'Critical', label: '< 30 days', icon: AlertTriangle },
          { id: 'Soon',     label: '30-60 days', icon: Clock },
          { id: 'Upcoming', label: '60-90 days', icon: Clock },
          { id: 'Expired',  label: 'Expired', icon: AlertTriangle },
        ].map(opt => {
          const Icon = opt.icon
          const count = opt.id === 'all' ? rows.length : (counts[opt.id] || 0)
          return (
            <button
              key={opt.id}
              onClick={() => setBandFilter(opt.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${
                bandFilter === opt.id
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-bg-card border-border text-text-muted hover:text-text-primary'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {opt.label}
              <Badge tone={bandFilter === opt.id ? 'accent' : 'neutral'} className="ml-0.5">{count}</Badge>
            </button>
          )
        })}
      </div>

      {isLoading && <div className="text-sm text-text-muted">Loading…</div>}

      {!isLoading && rows.length === 0 && (
        <EmptyState
          icon={<Repeat className="w-7 h-7 text-text-muted" />}
          title="No contracts up for renewal"
          description="When signed contracts approach 90 days from expiry, they land here automatically."
        />
      )}

      <ul className="space-y-2">
        {rows.map(r => (
          <Card key={r.contract_id} padding="md" className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/app/crm/pipeline?deal=${r.deal_id}`} className="text-sm font-semibold text-text-primary hover:text-accent">
                  {r.brand_name}
                </Link>
                <Badge tone={BAND_TONE[r.renewal_band] || 'neutral'}>{r.renewal_band}</Badge>
                {r.account_name && <Badge tone="info">{r.account_name}</Badge>}
                {r.renewal_in_progress && <Badge tone="success"><CheckCircle className="w-3 h-3 inline mr-0.5" />Renewal opened</Badge>}
              </div>
              <div className="text-[11px] text-text-muted font-mono mt-1 flex gap-3 flex-wrap">
                <span>Expires {r.expiration_date}</span>
                <span className={r.days_remaining < 30 ? 'text-danger' : r.days_remaining < 60 ? 'text-warning' : ''}>
                  {r.days_remaining < 0 ? `${Math.abs(r.days_remaining)} days overdue` : `${r.days_remaining} days remaining`}
                </span>
                {r.total_value && <span>${Number(r.total_value).toLocaleString()}</span>}
                <span>fulfillment {r.fulfillment_pct}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!r.renewal_in_progress && (
                <Button size="sm" onClick={() => startRenewal.mutate(r)} disabled={startRenewal.isPending}>
                  <Zap className="w-3.5 h-3.5" /> Start renewal
                </Button>
              )}
              <Link to={`/app/crm/pipeline?deal=${r.deal_id}`} className="text-[11px] text-accent hover:underline">
                Open deal →
              </Link>
            </div>
          </Card>
        ))}
      </ul>
    </div>
  )
}

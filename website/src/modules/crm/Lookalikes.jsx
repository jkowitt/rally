import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { findLookalikes, generateIcpCluster } from '@/lib/claude'
import { Sparkles, Plus, X, Target, RefreshCw } from 'lucide-react'

// Lookalikes — surface "brands like the ones you've already won"
// or "brands like the seed deal you're working." Two ways to seed:
//   1. Pick a specific deal as seed → returns lookalikes for it
//   2. Run "from closed-won" → uses last 30 wins to build an ICP
//      then asks for lookalikes against the ICP profile
export default function Lookalikes() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [seedKind, setSeedKind] = useState('icp_cluster') // 'icp_cluster' | 'deal'
  const [selectedDealId, setSelectedDealId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [icp, setIcp] = useState(null)

  const { data: deals = [] } = useQuery({
    queryKey: ['property-deals', profile?.property_id],
    queryFn: async () => {
      if (!profile?.property_id) return []
      const { data } = await supabase
        .from('deals')
        .select('id, brand_name, stage, sub_industry, city, state, value, employees, revenue_thousands')
        .eq('property_id', profile.property_id)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!profile?.property_id,
  })

  const { data: lookalikes = [], isLoading } = useQuery({
    queryKey: ['lookalikes', profile?.property_id],
    queryFn: async () => {
      if (!profile?.property_id) return []
      const { data } = await supabase
        .from('prospect_lookalikes')
        .select('*')
        .eq('property_id', profile.property_id)
        .eq('status', 'pending')
        .order('similarity_score', { ascending: false })
        .limit(50)
      return data || []
    },
    enabled: !!profile?.property_id,
  })

  const wonDeals = deals.filter(d => ['Renewed', 'Contracted', 'In Fulfillment'].includes(d.stage))

  async function runIcp() {
    if (wonDeals.length === 0) {
      toast({ title: 'Need at least one closed-won deal', description: 'Win a deal first so the ICP has something to cluster.', type: 'warning' })
      return
    }
    setGenerating(true)
    try {
      const cluster = await generateIcpCluster({ wins: wonDeals })
      if (!cluster) throw new Error('ICP cluster generator returned nothing')
      // Persist to icp_clusters
      await supabase.from('icp_clusters').update({ is_current: false }).eq('property_id', profile.property_id)
      await supabase.from('icp_clusters').insert({
        property_id: profile.property_id,
        generated_by: profile.id,
        win_count: wonDeals.length,
        cluster_summary: cluster.summary,
        cluster_industries: cluster.industries || [],
        cluster_size_band: cluster.size_band,
        cluster_geography: cluster.geography || [],
        cluster_traits: cluster.traits || {},
        is_current: true,
      })
      setIcp(cluster)
      // Now produce lookalikes against the ICP using a synthetic seed
      const seed = {
        brand_name: cluster.summary,
        sub_industry: cluster.industries?.[0],
      }
      const result = await findLookalikes({ deal: seed, recent_wins: wonDeals })
      await persistLookalikes(result, null, 'icp_cluster')
      qc.invalidateQueries({ queryKey: ['lookalikes', profile.property_id] })
      toast({ title: `Generated ${result.length} lookalikes`, type: 'success' })
    } catch (e) {
      toast({ title: 'Could not generate', description: humanError(e), type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  async function runForDeal() {
    const seed = deals.find(d => d.id === selectedDealId)
    if (!seed) return
    setGenerating(true)
    try {
      const result = await findLookalikes({ deal: seed, recent_wins: wonDeals })
      await persistLookalikes(result, seed.id, 'deal')
      qc.invalidateQueries({ queryKey: ['lookalikes', profile.property_id] })
      toast({ title: `Generated ${result.length} lookalikes`, description: `Seeded from ${seed.brand_name}`, type: 'success' })
    } catch (e) {
      toast({ title: 'Could not generate', description: humanError(e), type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  async function persistLookalikes(rows, seedDealId, seedKindLocal) {
    if (!rows?.length) return
    const inserts = rows.map(r => ({
      property_id: profile.property_id,
      seed_deal_id: seedDealId,
      seed_kind: seedKindLocal,
      candidate_company: r.company,
      candidate_industry: r.industry,
      candidate_website: r.website,
      candidate_linkedin: r.linkedin,
      candidate_city: r.city,
      candidate_state: r.state,
      similarity_score: r.similarity_score,
      rationale: r.rationale,
      payload: r,
    }))
    await supabase.from('prospect_lookalikes').insert(inserts)
  }

  const dismiss = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('prospect_lookalikes')
        .update({ status: 'dismissed', acted_at: new Date().toISOString(), acted_by: profile.id })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lookalikes', profile.property_id] }),
  })

  const addAsDeal = useMutation({
    mutationFn: async (l) => {
      // First, ask the DB if any existing account name resembles
      // this candidate brand — if confidence is high, surface it
      // and let the rep opt into linking.
      let suggestedAccountId = null
      try {
        const { data: suggestions } = await supabase.rpc('suggest_account_for_brand', {
          p_property_id: profile.property_id,
          p_brand: l.candidate_company,
        })
        const top = (suggestions || [])[0]
        if (top && Number(top.similarity) >= 0.5) {
          const ok = window.confirm(
            `Looks similar to existing account "${top.account_name}". ` +
            `Link this new deal under that account?`
          )
          if (ok) suggestedAccountId = top.account_id
        }
      } catch { /* RPC may not be deployed yet — proceed without suggestion */ }

      // Build a richer notes blob: rationale + similarity score +
      // any structured fields from the candidate payload.
      const noteLines = []
      noteLines.push(`Lookalike from ${l.seed_kind === 'deal' ? 'a seed deal' : 'closed-won ICP'}.`)
      if (l.rationale) noteLines.push(`Rationale: ${l.rationale}`)
      if (l.similarity_score != null) noteLines.push(`Similarity: ${Math.round(Number(l.similarity_score) * 100)}%`)

      const { error } = await supabase.from('deals').insert({
        property_id: profile.property_id,
        brand_name: l.candidate_company,
        sub_industry: l.candidate_industry,
        website: l.candidate_website,
        linkedin: l.candidate_linkedin,
        city: l.candidate_city,
        state: l.candidate_state,
        stage: 'Prospect',
        notes: noteLines.join('\n'),
        account_id: suggestedAccountId,
      })
      if (error) throw error
      await supabase.from('prospect_lookalikes')
        .update({ status: 'added', acted_at: new Date().toISOString(), acted_by: profile.id })
        .eq('id', l.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lookalikes', profile.property_id] })
      toast({ title: 'Added to pipeline', type: 'success' })
    },
    onError: (e) => toast({ title: 'Could not add', description: humanError(e), type: 'error' }),
  })

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'CRM & Prospecting', to: '/app' },
        { label: 'Lookalikes' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Target className="w-6 h-6 text-accent" />
          Lookalikes
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Find brands that pattern-match to your wins or to a specific deal.
        </p>
      </div>

      <Card padding="md" className="space-y-3">
        <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit">
          <button
            onClick={() => setSeedKind('icp_cluster')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${seedKind === 'icp_cluster' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}
          >
            From closed-won ICP
          </button>
          <button
            onClick={() => setSeedKind('deal')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${seedKind === 'deal' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}
          >
            From a specific deal
          </button>
        </div>

        {seedKind === 'icp_cluster' && (
          <div className="space-y-2">
            <p className="text-xs text-text-muted">
              Reads your last {wonDeals.length} won deal{wonDeals.length === 1 ? '' : 's'}, derives an ICP, and finds 10 lookalikes.
            </p>
            <Button onClick={runIcp} disabled={generating || wonDeals.length === 0}>
              <Sparkles className="w-3.5 h-3.5" /> {generating ? 'Generating…' : 'Run reverse-ICP scan'}
            </Button>
          </div>
        )}

        {seedKind === 'deal' && (
          <div className="space-y-2">
            <select
              value={selectedDealId}
              onChange={(e) => setSelectedDealId(e.target.value)}
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">— Pick a seed deal —</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>{d.brand_name} ({d.stage})</option>
              ))}
            </select>
            <Button onClick={runForDeal} disabled={!selectedDealId || generating}>
              <Sparkles className="w-3.5 h-3.5" /> {generating ? 'Generating…' : 'Find 10 lookalikes'}
            </Button>
          </div>
        )}

        {icp && (
          <div className="bg-accent/5 border border-accent/30 rounded p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-accent mb-1">Your ICP</div>
            <p className="text-sm text-text-secondary">{icp.summary}</p>
            {icp.industries?.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {icp.industries.map((i, ix) => <Badge key={ix} tone="accent">{i}</Badge>)}
              </div>
            )}
          </div>
        )}
      </Card>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-text-primary">Pending lookalikes ({lookalikes.length})</h2>
        </div>

        {isLoading && <div className="text-sm text-text-muted">Loading…</div>}

        {!isLoading && lookalikes.length === 0 && (
          <EmptyState
            title="No pending lookalikes"
            description="Run a scan above to surface 10 candidate brands."
          />
        )}

        <div className="space-y-2">
          {lookalikes.map(l => (
            <Card key={l.id} padding="md" className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text-primary">{l.candidate_company}</span>
                  {l.candidate_industry && <Badge tone="info">{l.candidate_industry}</Badge>}
                  {l.similarity_score != null && (
                    <span className="text-[10px] font-mono text-text-muted">
                      similarity {Math.round(Number(l.similarity_score) * 100)}%
                    </span>
                  )}
                </div>
                {l.rationale && <p className="text-xs text-text-secondary mt-1">{l.rationale}</p>}
                <div className="flex gap-3 mt-1.5 text-[11px] text-text-muted font-mono">
                  {l.candidate_city && <span>{l.candidate_city}{l.candidate_state ? `, ${l.candidate_state}` : ''}</span>}
                  {l.candidate_website && <a href={`https://${l.candidate_website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">website ↗</a>}
                  {l.candidate_linkedin && <a href={`https://${l.candidate_linkedin.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">LinkedIn ↗</a>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Button size="sm" onClick={() => addAsDeal.mutate(l)} disabled={addAsDeal.isPending}>
                  <Plus className="w-3.5 h-3.5" /> Add to pipeline
                </Button>
                <button
                  onClick={() => dismiss.mutate(l.id)}
                  aria-label="Dismiss"
                  className="text-text-muted hover:text-danger p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

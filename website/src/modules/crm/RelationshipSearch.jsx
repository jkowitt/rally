import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { Search, Users, Mail, Briefcase, AlertTriangle } from 'lucide-react'

// RelationshipSearch — "Has anyone on the team ever talked to <brand>?"
// Calls the search_brand_history RPC which unions contacts + outreach_log
// + deals into a single result. Also surfaces lead-conflict warnings:
// when two reps have separate open deals against the same brand.
export default function RelationshipSearch() {
  const { profile } = useAuth()
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')

  const { data: results, isLoading } = useQuery({
    queryKey: ['brand-history', profile?.property_id, submitted],
    enabled: !!profile?.property_id && submitted.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_brand_history', {
        p_property_id: profile.property_id,
        p_brand_name: submitted,
      })
      if (error) throw error
      return data || []
    },
  })

  // Surface lead conflicts (two open deals at the same brand)
  const { data: conflicts = [] } = useQuery({
    queryKey: ['deal-conflicts', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_conflicts')
        .select('*')
        .eq('property_id', profile.property_id)
      if (error) throw error
      return data || []
    },
  })

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'CRM & Prospecting', to: '/app' },
        { label: 'Relationship Search' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Users className="w-6 h-6 text-accent" />
          Relationship Search
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Has anyone on the team ever talked to a brand? Search every email, contact, and deal.
        </p>
      </div>

      {conflicts.length > 0 && (
        <Card padding="md" className="border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold text-text-primary">Lead conflicts ({conflicts.length})</h2>
          </div>
          <p className="text-xs text-text-muted mb-2">Two or more open deals targeting the same brand. Pick a single owner before reaching out.</p>
          <ul className="space-y-2">
            {conflicts.map((c, i) => (
              <li key={i} className="flex items-center justify-between bg-bg-card border border-border rounded p-2 text-xs">
                <span className="text-text-primary font-medium">{c.brand_name}</span>
                <div className="flex gap-2">
                  <Link to={`/app/crm/pipeline?deal=${c.deal_a_id}`} className="text-accent hover:underline">Deal A</Link>
                  <Link to={`/app/crm/pipeline?deal=${c.deal_b_id}`} className="text-accent hover:underline">Deal B</Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card padding="md">
        <form
          onSubmit={(e) => { e.preventDefault(); setSubmitted(q.trim()) }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Brand name (e.g. Liberty Mutual)"
            className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <Button type="submit" disabled={q.trim().length < 2}>
            <Search className="w-3.5 h-3.5" /> Search
          </Button>
        </form>
      </Card>

      {submitted && (
        <div className="space-y-3">
          {isLoading && <div className="text-sm text-text-muted">Searching…</div>}

          {!isLoading && (!results || results.length === 0) && (
            <EmptyState
              title={`No history with "${submitted}"`}
              description="Nobody on the team has emailed, met, or logged a deal with anyone matching this brand."
            />
          )}

          {results?.map((r) => (
            <Card key={r.source} padding="md">
              <div className="flex items-center gap-2 mb-2">
                <SourceIcon source={r.source} />
                <span className="text-sm font-semibold text-text-primary capitalize">{r.source.replace('_', ' ')}</span>
                <Badge tone="accent">{r.hit_count} hit{r.hit_count === 1 ? '' : 's'}</Badge>
                {r.latest_at && (
                  <span className="text-[10px] font-mono text-text-muted">latest: {new Date(r.latest_at).toLocaleDateString()}</span>
                )}
              </div>
              <DetailsList source={r.source} details={r.details} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function SourceIcon({ source }) {
  if (source === 'contacts') return <Users className="w-4 h-4 text-accent" />
  if (source === 'outreach_log') return <Mail className="w-4 h-4 text-accent" />
  if (source === 'deals') return <Briefcase className="w-4 h-4 text-accent" />
  return null
}

function DetailsList({ source, details }) {
  if (!Array.isArray(details)) return null
  const top = details.slice(0, 5)
  return (
    <ul className="space-y-1.5 text-xs">
      {top.map((d, i) => {
        if (source === 'contacts') {
          return (
            <li key={i} className="text-text-secondary">
              <span className="text-text-primary">{d.name}</span>
              {d.email && <span className="text-text-muted ml-1">({d.email})</span>}
              {d.company && <span className="text-text-muted ml-1">— {d.company}</span>}
            </li>
          )
        }
        if (source === 'outreach_log') {
          return (
            <li key={i} className="text-text-secondary">
              <Badge tone={d.direction === 'inbound' ? 'success' : 'info'} className="mr-1">{d.direction}</Badge>
              <span>{d.subject || '(no subject)'}</span>
              {d.to_email && <span className="text-text-muted ml-1">→ {d.to_email}</span>}
              {d.sent_at && <span className="text-text-muted ml-1">· {new Date(d.sent_at).toLocaleDateString()}</span>}
            </li>
          )
        }
        if (source === 'deals') {
          return (
            <li key={i} className="text-text-secondary">
              <Link to={`/app/crm/pipeline?deal=${d.id}`} className="text-accent hover:underline">{d.brand_name}</Link>
              <span className="text-text-muted ml-1">— {d.stage}</span>
              {d.value && <span className="text-text-muted ml-1">· ${Number(d.value).toLocaleString()}</span>}
            </li>
          )
        }
        return null
      })}
      {details.length > 5 && (
        <li className="text-[10px] text-text-muted">+ {details.length - 5} more…</li>
      )}
    </ul>
  )
}

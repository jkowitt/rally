import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { humanError } from '@/lib/humanError'
import { Globe, Sparkles, RefreshCw, ExternalLink, Linkedin, Users, ChevronDown } from 'lucide-react'

// CompanyResearchPanel — small inline panel that calls the
// /functions/v1/company-research edge function and displays the
// returned firmographics + leadership team. Designed to drop into
// a deal drawer or a prospect card; pass the company name (and a
// dealId when available so the function can write industry/website
// back to the deal).
//
// State shape:
//   - cached row from company_research (if any) is the steady-state
//     display; we read it via React Query keyed on company_name.
//   - "Research with AI" button kicks the edge function which
//     upserts that row. We invalidate the query on success.
export default function CompanyResearchPanel({ companyName, dealId, domain }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [expandedSources, setExpandedSources] = useState(false)

  const { data: cached, isLoading: loadingCache } = useQuery({
    queryKey: ['company-research', companyName],
    enabled: !!companyName,
    queryFn: async () => {
      const { data } = await supabase
        .from('company_research')
        .select('*')
        .ilike('company_name', companyName)
        .order('researched_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
  })

  const research = useMutation({
    mutationFn: async (refresh = false) => {
      const { data, error } = await supabase.functions.invoke('company-research', {
        body: { company_name: companyName, deal_id: dealId, domain, refresh },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Research failed')
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['company-research', companyName] })
      qc.invalidateQueries({ queryKey: ['deals'] })
      toast({
        title: data.cached ? 'Loaded from cache' : 'Research complete',
        description: data.research?.industry ? `Industry: ${data.research.industry}` : undefined,
        type: 'success',
      })
    },
    onError: (err) => {
      toast({ title: 'Research failed', description: humanError(err), type: 'error' })
    },
  })

  if (!companyName) return null

  const r = cached
  const isStale = r?.expires_at && new Date(r.expires_at) < new Date()
  const hasResult = !!r && (r.industry || r.website || (r.leadership || []).length > 0)

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">
          <Sparkles className="w-3 h-3 text-accent" />
          AI Company Research
        </div>
        <button
          type="button"
          onClick={() => research.mutate(hasResult)}
          disabled={research.isPending || loadingCache}
          className="flex items-center gap-1 text-[11px] text-accent hover:opacity-80 disabled:opacity-40"
        >
          {research.isPending
            ? <><RefreshCw className="w-3 h-3 animate-spin" /> Researching…</>
            : hasResult
              ? <><RefreshCw className="w-3 h-3" /> Refresh</>
              : <><Sparkles className="w-3 h-3" /> Research with AI</>
          }
        </button>
      </div>

      {!hasResult && !research.isPending && (
        <div className="text-xs text-text-muted leading-relaxed">
          Click <span className="text-accent">Research with AI</span> to pull industry, website, and leadership team for <strong className="text-text-primary">{companyName}</strong> from the public web. Results cache for 90 days.
        </div>
      )}

      {hasResult && (
        <div className="space-y-3">
          {/* Industry + website row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {r.industry && (
              <Field label="Industry">
                <span className="inline-block text-xs text-text-primary bg-bg-surface border border-border rounded px-2 py-0.5">
                  {r.industry}
                </span>
              </Field>
            )}
            {r.website && (
              <Field label="Website">
                <a
                  href={normalizeUrl(r.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <Globe className="w-3 h-3" />
                  {humanDomain(r.website)}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </Field>
            )}
          </div>

          {r.description && (
            <Field label="Summary">
              <p className="text-xs text-text-secondary leading-relaxed">{r.description}</p>
            </Field>
          )}

          {(r.leadership || []).length > 0 && (
            <Field label={`Leadership (${(r.leadership || []).length})`}>
              <ul className="space-y-1.5">
                {(r.leadership || []).map((p, i) => (
                  <li key={`${p.name}-${i}`} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="text-text-primary truncate">{p.name}</div>
                      <div className="text-text-muted truncate">{p.title}</div>
                    </div>
                    {p.linkedin_url && (
                      <a
                        href={p.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-muted hover:text-accent shrink-0"
                        title={`${p.name} on LinkedIn`}
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {(r.sources || []).length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setExpandedSources(v => !v)}
                className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-text-secondary"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${expandedSources ? 'rotate-180' : ''}`} />
                Sources ({(r.sources || []).length})
              </button>
              {expandedSources && (
                <ul className="mt-2 space-y-1">
                  {(r.sources || []).map((s, i) => (
                    <li key={i} className="text-[11px]">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline truncate inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        {s.title || humanDomain(s.url)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-text-muted pt-2 border-t border-border">
            <Users className="w-3 h-3" />
            <span>
              Researched {timeAgo(r.researched_at)}
              {isStale && <span className="ml-1 text-warning">· stale</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-1">{label}</div>
      {children}
    </div>
  )
}

function normalizeUrl(url) {
  if (!url) return '#'
  return url.startsWith('http') ? url : `https://${url}`
}

function humanDomain(url) {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

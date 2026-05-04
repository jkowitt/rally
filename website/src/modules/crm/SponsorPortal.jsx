import { useParams } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Smart Links 2.0: per-section view telemetry. Section blocks
// register their visibility through an IntersectionObserver and
// emit page_view events with duration_ms when they leave the
// viewport. session_start fires once on mount; session_end fires
// on unload via beforeunload.
function logPortalEvent(payload) {
  // Fire-and-forget; never block UI on failure.
  try {
    fetch(`${import.meta.env.VITE_SUPABASE_URL || ''}/rest/v1/proposal_view_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch { /* swallow */ }
}

export default function SponsorPortal() {
  const { token } = useParams()

  // 1. Load portal link by token
  const { data: portalLink, isLoading: linkLoading, error: linkError } = useQuery({
    queryKey: ['sponsor-portal-link', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsor_portal_links')
        .select('*')
        .eq('token', token)
        .eq('active', true)
        .single()
      if (error || !data) throw new Error('Invalid link')
      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error('Link expired')
      return data
    },
    enabled: !!token,
    retry: false,
  })

  // 2. Load property
  const { data: property } = useQuery({
    queryKey: ['sponsor-portal-property', portalLink?.property_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, name, sport, city, state, logo_url')
        .eq('id', portalLink.property_id)
        .single()
      return data
    },
    enabled: !!portalLink?.property_id,
  })

  // 3. Load deal
  const { data: deal } = useQuery({
    queryKey: ['sponsor-portal-deal', portalLink?.deal_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('*')
        .eq('id', portalLink.deal_id)
        .single()
      return data
    },
    enabled: !!portalLink?.deal_id,
  })

  // 4. Load contacts for the deal
  const { data: contacts } = useQuery({
    queryKey: ['sponsor-portal-contacts', portalLink?.deal_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('deal_id', portalLink.deal_id)
        .order('is_primary', { ascending: false })
      return data || []
    },
    enabled: !!portalLink?.deal_id,
  })

  // 5. Load contracts with benefits
  const { data: contracts } = useQuery({
    queryKey: ['sponsor-portal-contracts', portalLink?.deal_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, brand_name, status, signed, effective_date, expiration_date, total_value, contract_benefits(*)')
        .eq('deal_id', portalLink.deal_id)
      return data || []
    },
    enabled: !!portalLink?.deal_id,
  })

  // 6. Load assets
  const { data: assets } = useQuery({
    queryKey: ['sponsor-portal-assets', portalLink?.deal_id, contracts],
    queryFn: async () => {
      const { data: fromDealAssets } = await supabase
        .from('deal_assets')
        .select('*, assets(id, name, category, base_price, quantity)')
        .eq('deal_id', portalLink.deal_id)
      const contractIds = (contracts || []).map(c => c.id).filter(Boolean)
      let fromContracts = []
      if (contractIds.length > 0) {
        const { data } = await supabase
          .from('assets')
          .select('id, name, category, base_price, quantity, from_contract, source_contract_id')
          .in('source_contract_id', contractIds)
        fromContracts = data || []
      }
      const allAssets = []
      const seen = new Set()
      for (const da of (fromDealAssets || [])) {
        if (da.assets && !seen.has(da.assets.id)) {
          seen.add(da.assets.id)
          allAssets.push({ ...da.assets, proposed_price: da.custom_price })
        }
      }
      for (const a of fromContracts) {
        if (!seen.has(a.id)) {
          seen.add(a.id)
          allAssets.push(a)
        }
      }
      return allAssets
    },
    enabled: !!portalLink?.deal_id && contracts !== undefined,
  })

  // 7. Load fulfillment records
  const { data: fulfillment } = useQuery({
    queryKey: ['sponsor-portal-fulfillment', portalLink?.deal_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('fulfillment_records')
        .select('id, benefit_id, scheduled_date, delivered, delivered_date, contract_benefits!fulfillment_records_benefit_id_fkey(benefit_description)')
        .eq('deal_id', portalLink.deal_id)
        .order('scheduled_date')
      return data || []
    },
    enabled: !!portalLink?.deal_id,
  })

  // Session start / end telemetry. Hooks MUST run before any
  // early-return below (rules of hooks). The effect short-circuits
  // internally when portalLink isn't loaded yet.
  const sessionStartedRef = useRef(false)
  useEffect(() => {
    if (!portalLink?.id || sessionStartedRef.current) return
    sessionStartedRef.current = true
    logPortalEvent({
      property_id: portalLink.property_id,
      deal_id: portalLink.deal_id,
      portal_link_id: portalLink.id,
      event_type: 'session_start',
      user_agent: navigator.userAgent.slice(0, 500),
    })
    const onUnload = () => {
      logPortalEvent({
        property_id: portalLink.property_id,
        deal_id: portalLink.deal_id,
        portal_link_id: portalLink.id,
        event_type: 'session_end',
      })
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [portalLink?.id, portalLink?.property_id, portalLink?.deal_id])

  // --- Invalid / expired link ---
  if (linkError || (!linkLoading && !portalLink)) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-semibold text-text-primary">This link is invalid or has expired</h1>
          <p className="text-sm text-text-muted">Please contact the property for a new sponsor portal link.</p>
        </div>
      </div>
    )
  }

  // --- Loading ---
  if (linkLoading || !deal) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E8B84B] border-t-transparent rounded-full" />
      </div>
    )
  }

  const fulfillmentDelivered = (fulfillment || []).filter(f => f.delivered).length || 0
  const fulfillmentTotal = fulfillment?.length || 0
  const fulfillmentPct = fulfillmentTotal ? Math.round((fulfillmentDelivered / fulfillmentTotal) * 100) : 0

  const stageColor = {
    Prospect: 'bg-[#1C2333] text-text-secondary',
    'Proposal Sent': 'bg-yellow-500/10 text-yellow-400',
    Negotiation: 'bg-[#E8B84B]/10 text-[#E8B84B]',
    Contracted: 'bg-emerald-500/10 text-emerald-400',
    'In Fulfillment': 'bg-emerald-500/10 text-emerald-400',
    Renewed: 'bg-emerald-500/10 text-emerald-400',
    Declined: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-text-primary">
      {/* Header */}
      <header className="border-b border-border bg-[#161B22]">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-center gap-4">
            {property?.logo_url ? (
              <img src={property.logo_url} alt={property?.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#E8B84B]/10 border border-[#E8B84B]/20 flex items-center justify-center text-[#E8B84B] font-bold text-lg">
                {property?.name?.[0] || '?'}
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-text-primary">{property?.name || 'Property'}</h1>
              {property?.sport && (
                <p className="text-xs text-text-muted font-mono">
                  {property.sport}{property.city ? ` — ${property.city}, ${property.state}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        {/* Deal overview */}
        <TrackedSection portalLink={portalLink} pageIndex={0} pageLabel="overview">
          <h2 className="text-xl font-semibold text-text-primary mb-1">{deal.brand_name}</h2>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`text-xs font-mono px-2.5 py-1 rounded ${stageColor[deal.stage] || stageColor.Prospect}`}>
              {deal.stage}
            </span>
            {deal.priority && (
              <span className="text-xs font-mono text-text-muted">{deal.priority} Priority</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#161B22] border border-border rounded-lg p-4 text-center">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Deal Value</div>
              <div className="text-xl font-semibold text-[#E8B84B] font-mono mt-1">
                {deal.value ? `$${Number(deal.value).toLocaleString()}` : '—'}
              </div>
            </div>
            <div className="bg-[#161B22] border border-border rounded-lg p-4 text-center">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">Start Date</div>
              <div className="text-sm text-text-primary font-mono mt-2">{deal.start_date || '—'}</div>
            </div>
            <div className="bg-[#161B22] border border-border rounded-lg p-4 text-center">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">End Date</div>
              <div className="text-sm text-text-primary font-mono mt-2">{deal.end_date || '—'}</div>
            </div>
          </div>
        </TrackedSection>

        {/* Contract Benefits */}
        {contracts?.length > 0 && (
          <TrackedSection portalLink={portalLink} pageIndex={1} pageLabel="contracts">
            <SectionHeader title="Contract Benefits" />
            <div className="space-y-4">
              {contracts.map(c => (
                <div key={c.id} className="bg-[#161B22] border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-text-primary font-medium">{c.brand_name || 'Contract'}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${c.signed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {c.status || (c.signed ? 'Signed' : 'Draft')}
                    </span>
                  </div>
                  {c.total_value && (
                    <div className="text-sm text-[#E8B84B] font-mono mb-3">${Number(c.total_value).toLocaleString()}</div>
                  )}
                  <div className="flex gap-4 text-[10px] text-text-muted font-mono mb-3">
                    {c.effective_date && <span>Effective: {c.effective_date}</span>}
                    {c.expiration_date && <span>Expires: {c.expiration_date}</span>}
                  </div>
                  {c.contract_benefits?.length > 0 && (
                    <div className="border-t border-border pt-3 space-y-2">
                      {c.contract_benefits.map((b, i) => (
                        <div key={b.id || i} className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">{b.benefit_description}</span>
                          <span className="text-text-muted font-mono shrink-0 ml-3">
                            {b.quantity > 1 ? `${b.quantity}x` : ''}{b.value ? ` $${Number(b.value).toLocaleString()}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TrackedSection>
        )}

        {/* Fulfillment Progress */}
        {fulfillment?.length > 0 && (
          <TrackedSection portalLink={portalLink} pageIndex={2} pageLabel="fulfillment">
            <SectionHeader title={`Fulfillment Progress — ${fulfillmentDelivered}/${fulfillmentTotal} delivered`} />
            <div className="bg-[#161B22] border border-border rounded-lg p-4">
              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-[#0D1117] rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${fulfillmentDelivered === fulfillmentTotal ? 'bg-emerald-500' : 'bg-[#E8B84B]'}`}
                    style={{ width: `${fulfillmentPct}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-text-muted shrink-0">{fulfillmentPct}%</span>
              </div>
              {/* Item list */}
              <div className="space-y-2">
                {fulfillment.map(f => {
                  const isOverdue = !f.delivered && f.scheduled_date && new Date(f.scheduled_date) < new Date()
                  let statusLabel = 'Pending'
                  let statusClass = 'bg-yellow-500/10 text-yellow-400'
                  if (f.delivered) {
                    statusLabel = 'Delivered'
                    statusClass = 'bg-emerald-500/10 text-emerald-400'
                  } else if (isOverdue) {
                    statusLabel = 'Overdue'
                    statusClass = 'bg-red-500/10 text-red-400'
                  }
                  return (
                    <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className={`text-xs truncate mr-3 ${f.delivered ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                        {f.contract_benefits?.benefit_description || 'Fulfillment item'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {f.scheduled_date && (
                          <span className="text-[10px] text-text-muted font-mono">{f.scheduled_date}</span>
                        )}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TrackedSection>
        )}

        {/* Assets */}
        {assets?.length > 0 && (
          <TrackedSection portalLink={portalLink} pageIndex={3} pageLabel="assets">
            <SectionHeader title={`Sponsorship Assets (${assets.length})`} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {assets.map(a => (
                <div key={a.id} className="bg-[#161B22] border border-border rounded-lg p-3">
                  <div className="text-xs text-text-primary font-medium truncate">{a.name}</div>
                  <div className="text-[10px] text-text-muted font-mono mt-0.5">{a.category}</div>
                  {(a.base_price || a.proposed_price) && (
                    <div className="text-xs text-[#E8B84B] font-mono mt-1">
                      ${Number(a.proposed_price || a.base_price).toLocaleString()}
                      {a.quantity > 1 && ` x${a.quantity}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TrackedSection>
        )}

        {/* Contacts */}
        {contacts?.length > 0 && (
          <TrackedSection portalLink={portalLink} pageIndex={4} pageLabel="contacts">
            <SectionHeader title="Contacts" />
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={c.id || i} className="bg-[#161B22] border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-primary font-medium">{c.first_name} {c.last_name}</span>
                    {c.is_primary && (
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[#E8B84B] text-[#0D1117]">Primary</span>
                    )}
                  </div>
                  {c.position && <div className="text-xs text-text-secondary mt-0.5">{c.position}</div>}
                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    {c.email && <span className="text-xs text-[#E8B84B]">{c.email}</span>}
                    {c.phone && <span className="text-xs text-[#E8B84B]">{c.phone}</span>}
                  </div>
                </div>
              ))}
            </div>
          </TrackedSection>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="text-center text-xs text-text-muted font-mono">
          Powered by <span className="text-[#E8B84B]">Loud Legacy</span>
        </div>
      </footer>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-3">{title}</div>
  )
}

// TrackedSection — wraps a portal section and emits a page_view
// event with duration_ms when the section enters and then leaves
// the viewport. Coarse measurement (intersection-based, threshold 0.4),
// good enough to surface "they spent 90s on the contract page."
function TrackedSection({ portalLink, pageIndex, pageLabel, children }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !portalLink?.id) return
    let entryAt = null
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !entryAt) {
          entryAt = Date.now()
        } else if (!e.isIntersecting && entryAt) {
          const duration = Date.now() - entryAt
          entryAt = null
          // Only log meaningful dwells (> 500ms)
          if (duration < 500) continue
          logPortalEvent({
            property_id: portalLink.property_id,
            deal_id: portalLink.deal_id,
            portal_link_id: portalLink.id,
            event_type: 'page_view',
            page_index: pageIndex,
            page_label: pageLabel,
            duration_ms: duration,
          })
        }
      }
    }, { threshold: 0.4 })
    obs.observe(ref.current)
    return () => {
      // Flush any pending dwell on unmount.
      if (entryAt) {
        const duration = Date.now() - entryAt
        if (duration >= 500) {
          logPortalEvent({
            property_id: portalLink.property_id,
            deal_id: portalLink.deal_id,
            portal_link_id: portalLink.id,
            event_type: 'page_view',
            page_index: pageIndex,
            page_label: pageLabel,
            duration_ms: duration,
          })
        }
      }
      obs.disconnect()
    }
  }, [portalLink?.id, portalLink?.property_id, portalLink?.deal_id, pageIndex, pageLabel])
  return <section ref={ref}>{children}</section>
}

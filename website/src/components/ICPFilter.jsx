import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

// Industry-specific default ICPs
const INDUSTRY_DEFAULTS = {
  sports: {
    company_size: 'mid',
    business_type: 'b2c',
    location_scope: 'regional',
    industries: ['Food & Beverage', 'Financial Services', 'Automotive', 'Healthcare', 'Retail', 'Technology'],
    ideal_description: 'Mid-market companies with marketing budgets that align with our audience demographics. Focus on brands that already invest in sponsorship or experiential marketing.',
  },
  nonprofit: {
    company_size: 'any',
    business_type: 'b2b',
    location_scope: 'local',
    industries: ['Financial Services', 'Healthcare', 'Professional Services', 'Technology', 'Real Estate'],
    attributes: ['local', 'csr_focused'],
    ideal_description: 'Local/regional companies with corporate social responsibility programs. Family businesses, community-focused banks, local healthcare systems, and founder-led tech companies.',
  },
  conference: {
    company_size: 'mid',
    business_type: 'b2b',
    location_scope: 'national',
    industries: ['Technology', 'SaaS', 'Professional Services', 'Financial Services', 'Consulting'],
    ideal_description: 'B2B SaaS and professional services companies whose ideal customers attend our conference. Companies with existing event marketing budgets.',
  },
  media: {
    company_size: 'mid',
    business_type: 'b2c',
    location_scope: 'regional',
    industries: ['Retail', 'Restaurant', 'Automotive', 'Real Estate', 'Healthcare', 'Financial Services'],
    ideal_description: 'Mid-market brands targeting our audience demographic. Focus on companies that prefer measured, trackable advertising and are shifting from traditional to digital.',
  },
  realestate: {
    company_size: 'small',
    business_type: 'b2c',
    location_scope: 'local',
    industries: ['Retail', 'Restaurant', 'Fitness', 'Beauty', 'Professional Services', 'Healthcare'],
    ideal_description: 'Local and regional retail/service businesses looking for anchor tenant or partnership opportunities. Prioritize growing brands with 2-10 locations.',
  },
  entertainment: {
    company_size: 'mid',
    business_type: 'b2c',
    location_scope: 'regional',
    industries: ['Beverage', 'Food', 'Automotive', 'Fashion', 'Technology', 'Spirits'],
    ideal_description: 'Lifestyle brands targeting our venue demographic. Focus on beverage companies, fashion brands, and experiential consumer brands.',
  },
}

const COMPANY_SIZES = [
  { value: 'any', label: 'Any Size' },
  { value: 'startup', label: 'Startup (<50 employees)' },
  { value: 'small', label: 'Small (50-200)' },
  { value: 'mid', label: 'Mid-Market (200-1,000)' },
  { value: 'large', label: 'Large (1,000-5,000)' },
  { value: 'enterprise', label: 'Enterprise (5,000+)' },
]

const LOCATION_SCOPES = [
  { value: 'any', label: 'Any Location' },
  { value: 'local', label: 'Local (city/metro)' },
  { value: 'regional', label: 'Regional (state/region)' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
]

const BUSINESS_TYPES = [
  { value: 'any', label: 'Any Type' },
  { value: 'b2b', label: 'B2B' },
  { value: 'b2c', label: 'B2C' },
  { value: 'dtc', label: 'DTC' },
  { value: 'b2b2c', label: 'B2B2C' },
]

const FUNDING_STAGES = [
  { value: 'any', label: 'Any Stage' },
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b_plus', label: 'Series B+' },
  { value: 'public', label: 'Public' },
]

const ATTRIBUTES = [
  'local', 'woman_owned', 'minority_owned', 'veteran_owned', 'b_corp',
  'csr_focused', 'sustainable', 'founder_led', 'family_business', 'ceo_led',
  'nonprofit_partner', 'growth_stage', 'publicly_traded',
]

function getIndustryKey(propertyType) {
  const map = {
    college: 'sports', professional: 'sports', minor_league: 'sports', sports: 'sports',
    nonprofit: 'nonprofit', foundation: 'nonprofit',
    conference: 'conference', events: 'conference',
    media: 'media', publisher: 'media',
    realestate: 'realestate', real_estate: 'realestate',
    entertainment: 'entertainment', venue: 'entertainment',
  }
  return map[propertyType] || 'sports'
}

function emptyICP() {
  return {
    name: '',
    description: '',
    company_size: 'any',
    employee_min: '',
    employee_max: '',
    revenue_min: '',
    revenue_max: '',
    location_scope: 'any',
    cities: [],
    states: [],
    industries: [],
    sub_industries: [],
    exclude_industries: [],
    business_type: 'any',
    funding_stage: 'any',
    growth_stage: 'any',
    budget_min: '',
    budget_max: '',
    attributes: [],
    ideal_description: '',
  }
}

/**
 * ICPFilter — reusable Ideal Customer Profile editor and selector.
 * Use modes:
 *  - 'inline' — compact filter bar (for search pages)
 *  - 'full' — full editor (for settings/management)
 *  - 'compact' — dropdown selector only
 *
 * Props:
 *  - value: current ICP object
 *  - onChange: (icp) => void
 *  - propertyId: for loading/saving ICPs
 *  - mode: 'inline' | 'full' | 'compact'
 */
export default function ICPFilter({ value, onChange, propertyId, mode = 'inline' }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [savedICPs, setSavedICPs] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(value || emptyICP())

  const industry = getIndustryKey(profile?.properties?.type)

  useEffect(() => {
    if (!propertyId) return
    loadSavedICPs()
  }, [propertyId])

  async function loadSavedICPs() {
    try {
      const { data } = await supabase.from('icp_profiles').select('*').eq('property_id', propertyId).order('is_default', { ascending: false }).order('created_at', { ascending: false })
      setSavedICPs(data || [])
      const def = (data || []).find(i => i.is_default)
      if (def && !selectedId) {
        setSelectedId(def.id)
        setDraft(def)
        onChange?.(def)
      }
    } catch {}
  }

  function loadDefaults() {
    const defaults = INDUSTRY_DEFAULTS[industry] || INDUSTRY_DEFAULTS.sports
    const newDraft = { ...emptyICP(), name: `My ${industry} Ideal Customer`, ...defaults }
    setDraft(newDraft)
    onChange?.(newDraft)
    toast({ title: `Loaded ${industry} defaults`, type: 'success' })
  }

  async function saveICP() {
    if (!draft.name?.trim()) {
      toast({ title: 'Name required', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...draft,
        property_id: propertyId,
        employee_min: draft.employee_min ? parseInt(draft.employee_min) : null,
        employee_max: draft.employee_max ? parseInt(draft.employee_max) : null,
        revenue_min: draft.revenue_min ? parseFloat(draft.revenue_min) : null,
        revenue_max: draft.revenue_max ? parseFloat(draft.revenue_max) : null,
        budget_min: draft.budget_min ? parseFloat(draft.budget_min) : null,
        budget_max: draft.budget_max ? parseFloat(draft.budget_max) : null,
        updated_at: new Date().toISOString(),
      }
      if (draft.id) {
        await supabase.from('icp_profiles').update(payload).eq('id', draft.id)
      } else {
        payload.created_by = profile?.id
        const { data } = await supabase.from('icp_profiles').insert(payload).select().single()
        if (data) setDraft(data)
      }
      await loadSavedICPs()
      toast({ title: 'ICP saved', description: 'Will be used in prospect searches', type: 'success' })
      setShowEditor(false)
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, type: 'error' })
    }
    setSaving(false)
  }

  async function setAsDefault(id) {
    await supabase.from('icp_profiles').update({ is_default: false }).eq('property_id', propertyId)
    await supabase.from('icp_profiles').update({ is_default: true }).eq('id', id)
    await loadSavedICPs()
    toast({ title: 'Set as default', type: 'success' })
  }

  async function deleteICP(id) {
    if (!confirm('Delete this ICP?')) return
    await supabase.from('icp_profiles').delete().eq('id', id)
    await loadSavedICPs()
    if (selectedId === id) {
      setSelectedId('')
      setDraft(emptyICP())
      onChange?.(null)
    }
  }

  function selectICP(id) {
    setSelectedId(id)
    const icp = savedICPs.find(i => i.id === id)
    if (icp) {
      setDraft(icp)
      onChange?.(icp)
    } else {
      setDraft(emptyICP())
      onChange?.(null)
    }
  }

  function updateDraft(updates) {
    const newDraft = { ...draft, ...updates }
    setDraft(newDraft)
    if (!showEditor) onChange?.(newDraft) // live update when in inline mode
  }

  function toggleAttribute(attr) {
    const current = draft.attributes || []
    updateDraft({ attributes: current.includes(attr) ? current.filter(a => a !== attr) : [...current, attr] })
  }

  function addIndustry(field, value) {
    if (!value.trim()) return
    updateDraft({ [field]: [...(draft[field] || []), value.trim()] })
  }

  function removeItem(field, idx) {
    updateDraft({ [field]: (draft[field] || []).filter((_, i) => i !== idx) })
  }

  // ─── COMPACT MODE: just a selector ───
  if (mode === 'compact') {
    return (
      <select value={selectedId} onChange={e => selectICP(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary">
        <option value="">No ICP filter</option>
        {savedICPs.map(icp => (
          <option key={icp.id} value={icp.id}>{icp.name} {icp.is_default ? '(default)' : ''}</option>
        ))}
      </select>
    )
  }

  // ─── INLINE MODE: compact filter with expand button ───
  if (mode === 'inline') {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[10px] text-text-muted uppercase tracking-wider">ICP Filter</span>
            <select value={selectedId} onChange={e => selectICP(e.target.value)} className="bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary flex-1 min-w-0">
              <option value="">No filter (any company)</option>
              {savedICPs.map(icp => (
                <option key={icp.id} value={icp.id}>{icp.name} {icp.is_default ? '★' : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowEditor(!showEditor)} className="text-[10px] text-accent hover:underline">
              {showEditor ? 'Hide' : selectedId ? 'Edit' : '+ New'}
            </button>
            {!selectedId && (
              <button onClick={loadDefaults} className="text-[10px] text-text-muted hover:text-text-primary">
                Use {industry} defaults
              </button>
            )}
          </div>
        </div>

        {showEditor && <ICPEditor draft={draft} setDraft={updateDraft} toggleAttribute={toggleAttribute} addIndustry={addIndustry} removeItem={removeItem} loadDefaults={loadDefaults} onSave={saveICP} saving={saving} savedICPs={savedICPs} onSetDefault={setAsDefault} onDelete={deleteICP} />}

        {/* Summary chips when collapsed */}
        {!showEditor && draft && (draft.company_size !== 'any' || draft.location_scope !== 'any' || draft.industries?.length > 0) && (
          <div className="flex gap-1 flex-wrap">
            {draft.company_size && draft.company_size !== 'any' && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">{COMPANY_SIZES.find(s => s.value === draft.company_size)?.label}</span>}
            {draft.location_scope && draft.location_scope !== 'any' && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">{LOCATION_SCOPES.find(s => s.value === draft.location_scope)?.label}</span>}
            {draft.business_type && draft.business_type !== 'any' && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">{draft.business_type.toUpperCase()}</span>}
            {(draft.industries || []).slice(0, 3).map((ind, i) => <span key={i} className="text-[9px] bg-bg-surface text-text-secondary px-1.5 py-0.5 rounded">{ind}</span>)}
            {(draft.industries || []).length > 3 && <span className="text-[9px] text-text-muted">+{draft.industries.length - 3}</span>}
          </div>
        )}
      </div>
    )
  }

  // ─── FULL MODE: complete editor ───
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <ICPEditor draft={draft} setDraft={updateDraft} toggleAttribute={toggleAttribute} addIndustry={addIndustry} removeItem={removeItem} loadDefaults={loadDefaults} onSave={saveICP} saving={saving} savedICPs={savedICPs} onSetDefault={setAsDefault} onDelete={deleteICP} />
    </div>
  )
}

function ICPEditor({ draft, setDraft, toggleAttribute, addIndustry, removeItem, loadDefaults, onSave, saving, savedICPs, onSetDefault, onDelete }) {
  const [newIndustry, setNewIndustry] = useState('')
  const [newExclude, setNewExclude] = useState('')

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      {/* Saved ICPs bar */}
      {savedICPs?.length > 0 && (
        <div className="flex gap-1 flex-wrap pb-2 border-b border-border">
          <span className="text-[9px] text-text-muted uppercase mr-1 self-center">Saved:</span>
          {savedICPs.map(icp => (
            <div key={icp.id} className="flex items-center gap-0.5 bg-bg-surface border border-border rounded px-1.5 py-0.5">
              <span className="text-[9px] text-text-secondary">{icp.name}</span>
              {!icp.is_default && <button onClick={() => onSetDefault(icp.id)} className="text-[8px] text-accent hover:underline ml-1">★</button>}
              <button onClick={() => onDelete(icp.id)} className="text-[9px] text-danger hover:underline ml-0.5">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="text-[9px] text-text-muted uppercase block mb-1">ICP Name</label>
        <input value={draft.name || ''} onChange={e => setDraft({ name: e.target.value })} placeholder="e.g. Local Mid-Market B2C" className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
      </div>

      {/* Size & Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-text-muted uppercase block mb-1">Company Size</label>
          <select value={draft.company_size || 'any'} onChange={e => setDraft({ company_size: e.target.value })} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary">
            {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-text-muted uppercase block mb-1">Geographic Scope</label>
          <select value={draft.location_scope || 'any'} onChange={e => setDraft({ location_scope: e.target.value })} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary">
            {LOCATION_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Revenue & Employees */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-text-muted uppercase block mb-1">Employees (min-max)</label>
          <div className="flex gap-1">
            <input type="number" value={draft.employee_min || ''} onChange={e => setDraft({ employee_min: e.target.value })} placeholder="50" className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
            <input type="number" value={draft.employee_max || ''} onChange={e => setDraft({ employee_max: e.target.value })} placeholder="500" className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
          </div>
        </div>
        <div>
          <label className="text-[9px] text-text-muted uppercase block mb-1">Budget ($ min-max)</label>
          <div className="flex gap-1">
            <input type="number" value={draft.budget_min || ''} onChange={e => setDraft({ budget_min: e.target.value })} placeholder="5000" className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
            <input type="number" value={draft.budget_max || ''} onChange={e => setDraft({ budget_max: e.target.value })} placeholder="50000" className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
          </div>
        </div>
      </div>

      {/* Business Type & Funding */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-text-muted uppercase block mb-1">Business Type</label>
          <select value={draft.business_type || 'any'} onChange={e => setDraft({ business_type: e.target.value })} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary">
            {BUSINESS_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-text-muted uppercase block mb-1">Funding Stage</label>
          <select value={draft.funding_stage || 'any'} onChange={e => setDraft({ funding_stage: e.target.value })} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary">
            {FUNDING_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Industries */}
      <div>
        <label className="text-[9px] text-text-muted uppercase block mb-1">Target Industries</label>
        <div className="flex gap-1 mb-1">
          <input value={newIndustry} onChange={e => setNewIndustry(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIndustry('industries', newIndustry); setNewIndustry('') } }} placeholder="e.g. Healthcare" className="flex-1 bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
          <button onClick={() => { addIndustry('industries', newIndustry); setNewIndustry('') }} className="bg-accent/20 text-accent px-2 py-1 rounded text-[10px]">Add</button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(draft.industries || []).map((ind, i) => (
            <span key={i} className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded flex items-center gap-1">
              {ind}
              <button onClick={() => removeItem('industries', i)} className="text-danger hover:opacity-70">×</button>
            </span>
          ))}
        </div>
      </div>

      {/* Excluded Industries */}
      <div>
        <label className="text-[9px] text-text-muted uppercase block mb-1">Exclude Industries</label>
        <div className="flex gap-1 mb-1">
          <input value={newExclude} onChange={e => setNewExclude(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIndustry('exclude_industries', newExclude); setNewExclude('') } }} placeholder="e.g. Tobacco" className="flex-1 bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
          <button onClick={() => { addIndustry('exclude_industries', newExclude); setNewExclude('') }} className="bg-danger/20 text-danger px-2 py-1 rounded text-[10px]">Add</button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(draft.exclude_industries || []).map((ind, i) => (
            <span key={i} className="text-[9px] bg-danger/10 text-danger px-1.5 py-0.5 rounded flex items-center gap-1">
              {ind}
              <button onClick={() => removeItem('exclude_industries', i)} className="hover:opacity-70">×</button>
            </span>
          ))}
        </div>
      </div>

      {/* Attributes */}
      <div>
        <label className="text-[9px] text-text-muted uppercase block mb-1">Attributes (click to toggle)</label>
        <div className="flex gap-1 flex-wrap">
          {ATTRIBUTES.map(attr => {
            const selected = (draft.attributes || []).includes(attr)
            return (
              <button key={attr} onClick={() => toggleAttribute(attr)} className={`text-[9px] px-1.5 py-0.5 rounded border ${selected ? 'bg-accent/20 text-accent border-accent/40' : 'bg-bg-surface text-text-muted border-border'}`}>
                {attr.replace(/_/g, ' ')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Free-form description */}
      <div>
        <label className="text-[9px] text-text-muted uppercase block mb-1">Additional Criteria (tell Claude exactly what you want)</label>
        <textarea value={draft.ideal_description || ''} onChange={e => setDraft({ ideal_description: e.target.value })} placeholder="e.g. We're a college athletics program looking for local businesses with community focus. Skip national chains. Prefer founder-led companies with $10M-$50M revenue..." rows={3} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end border-t border-border pt-3">
        <button onClick={loadDefaults} className="text-[10px] text-text-muted hover:text-text-primary">Load Defaults</button>
        <button onClick={onSave} disabled={saving || !draft.name?.trim()} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50">
          {saving ? 'Saving...' : 'Save ICP'}
        </button>
      </div>
    </div>
  )
}

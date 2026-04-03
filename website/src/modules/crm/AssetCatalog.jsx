import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const CATEGORIES = ['LED Board', 'Jersey Patch', 'Radio Read', 'Social Post', 'Naming Right', 'Signage', 'Activation Space', 'Digital']

const CATEGORY_ICONS = {
  'LED Board': '📺',
  'Jersey Patch': '👕',
  'Radio Read': '📻',
  'Social Post': '📱',
  'Naming Right': '🏟️',
  'Signage': '🪧',
  'Activation Space': '🎪',
  'Digital': '💻',
}

export default function AssetCatalog() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [filter, setFilter] = useState('')
  const [view, setView] = useState('grid') // grid | table
  const [syncStatus, setSyncStatus] = useState('')

  // Fetch assets
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('property_id', propertyId)
        .order('category')
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  // Fetch proposed assets (from deal_assets where is_proposed = true)
  const { data: proposedAssets } = useQuery({
    queryKey: ['proposed-assets', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_assets')
        .select('*, deals!inner(brand_name, stage, property_id), assets!inner(name, category, base_price)')
        .eq('deals.property_id', propertyId)
      if (error) return []
      return data
    },
    enabled: !!propertyId,
  })

  // Fetch contract benefits to sync
  const { data: contractBenefits } = useQuery({
    queryKey: ['all-contract-benefits', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_benefits')
        .select('*, contracts!inner(property_id, brand_name, id)')
        .eq('contracts.property_id', propertyId)
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  // Auto-sync contract benefits into assets
  async function syncBenefitsToAssets() {
    if (!contractBenefits || !assets) return
    setSyncStatus('Syncing benefits...')

    const existingContractAssets = assets.filter(a => a.from_contract)
    let created = 0

    for (const benefit of contractBenefits) {
      // Skip if already linked to an asset or already synced
      if (benefit.asset_id) continue
      const alreadySynced = existingContractAssets.some(a =>
        a.source_contract_id === benefit.contract_id &&
        a.name === (benefit.benefit_description || 'Benefit')
      )
      if (alreadySynced) continue

      // Determine category from benefit description
      const category = guessCategory(benefit.benefit_description || '')

      const { error } = await supabase.from('assets').insert({
        property_id: propertyId,
        name: benefit.benefit_description || 'Contract Benefit',
        category,
        quantity: benefit.quantity || 1,
        base_price: benefit.value || null,
        active: true,
        from_contract: true,
        source_contract_id: benefit.contract_id,
        sold_count: benefit.quantity || 1,
        total_available: 0,
        notes: 'Auto-imported from contract: ' + (benefit.contracts?.brand_name || ''),
      })
      if (!error) created++
    }

    queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
    setSyncStatus(created > 0 ? `Synced ${created} new assets from contracts!` : 'All benefits already synced.')
    setTimeout(() => setSyncStatus(''), 3000)
  }

  const saveMutation = useMutation({
    mutationFn: async (asset) => {
      const payload = { ...asset }
      if (!payload.base_price) delete payload.base_price
      if (!payload.impressions_per_game) delete payload.impressions_per_game
      if (payload.id) {
        const { data, error } = await supabase.from('assets').update(payload).eq('id', payload.id).select().single()
        if (error) throw error
        return data
      }
      delete payload.id
      const { data, error } = await supabase.from('assets').insert({ ...payload, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
      toast({ title: 'Asset saved', type: 'success' })
      setShowForm(false)
      setEditingAsset(null)
    },
    onError: (err) => toast({ title: 'Error saving asset', description: err.message, type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
      toast({ title: 'Asset deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting asset', description: err.message, type: 'error' }),
  })

  // Update inventory (total_available)
  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, total_available }) => {
      const { error } = await supabase.from('assets').update({ total_available }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
      toast({ title: 'Inventory updated', type: 'success' })
    },
  })

  const filtered = assets?.filter((a) => !filter || a.category === filter) || []

  // Group by category for grid view
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(a => a.category === cat)
    if (items.length > 0) acc.push({ category: cat, items, count: items.length })
    return acc
  }, [])

  // Category summary stats
  const categorySummary = CATEGORIES.map(cat => {
    const items = assets?.filter(a => a.category === cat) || []
    const totalAvailable = items.reduce((s, a) => s + (a.total_available || 0), 0)
    const totalSold = items.reduce((s, a) => s + (a.sold_count || 0), 0)
    const totalValue = items.reduce((s, a) => s + (Number(a.base_price) || 0) * (a.quantity || 1), 0)
    return { category: cat, count: items.length, totalAvailable, totalSold, totalValue }
  }).filter(c => c.count > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Asset Catalog</h1>
          <p className="text-text-secondary text-sm mt-1">
            {assets?.length || 0} assets across {categorySummary.length} categories
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncBenefitsToAssets}
            className="bg-bg-card border border-border text-text-secondary px-3 py-2 rounded text-sm hover:text-accent hover:border-accent"
          >
            Sync from Contracts
          </button>
          <button
            onClick={() => { setEditingAsset(null); setShowForm(true) }}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          >
            + Add Asset
          </button>
        </div>
      </div>

      {syncStatus && (
        <p className="text-xs font-mono text-accent">{syncStatus}</p>
      )}

      {/* Proposed Assets Section */}
      {proposedAssets?.length > 0 && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-accent">Proposed Assets</span>
              <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">{proposedAssets.length}</span>
            </div>
            <span className="text-xs text-text-muted font-mono">Assets currently in proposals/pitches</span>
          </div>
          <div className="space-y-2">
            {proposedAssets.map((pa) => (
              <div key={pa.id} className="flex items-center justify-between bg-bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{CATEGORY_ICONS[pa.assets?.category] || '📦'}</span>
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary font-medium truncate">{pa.assets?.name || 'Asset'}</div>
                    <div className="flex gap-2 text-xs text-text-muted font-mono">
                      <span>{pa.assets?.category}</span>
                      <span>x{pa.quantity || 1}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono text-accent">
                    ${Number(pa.custom_price || pa.assets?.base_price || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="font-medium text-text-secondary">{pa.deals?.brand_name}</span>
                    <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                      pa.deals?.stage === 'Contracted' ? 'bg-success/10 text-success' :
                      pa.deals?.stage === 'Proposal Sent' ? 'bg-warning/10 text-warning' :
                      'bg-bg-surface text-text-muted'
                    }`}>
                      {pa.deals?.stage}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
            <span className="text-xs text-text-muted">Total proposed value</span>
            <span className="text-sm font-mono font-medium text-accent">
              ${proposedAssets.reduce((sum, pa) => sum + (Number(pa.custom_price || pa.assets?.base_price || 0) * (pa.quantity || 1)), 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categorySummary.map(({ category, count, totalAvailable, totalSold, totalValue }) => (
          <button
            key={category}
            onClick={() => setFilter(filter === category ? '' : category)}
            className={`bg-bg-surface border rounded-lg p-3 text-left transition-colors ${filter === category ? 'border-accent' : 'border-border hover:border-accent/50'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{CATEGORY_ICONS[category]}</span>
              <span className="text-xs font-mono text-text-muted">{count}</span>
            </div>
            <div className="text-sm font-medium text-text-primary truncate">{category}</div>
            <div className="flex gap-3 mt-1 text-xs font-mono">
              <span className="text-success">{totalSold} sold</span>
              <span className="text-text-muted">{totalAvailable} avail</span>
            </div>
            {totalValue > 0 && (
              <div className="text-xs font-mono text-accent mt-0.5">${totalValue.toLocaleString()}</div>
            )}
          </button>
        ))}
      </div>

      {/* View toggle + filter */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1 rounded text-xs font-mono ${!filter ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}
          >
            All ({assets?.length || 0})
          </button>
          {CATEGORIES.map((cat) => {
            const count = assets?.filter((a) => a.category === cat).length || 0
            if (count === 0) return null
            return (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? '' : cat)}
                className={`px-3 py-1 rounded text-xs font-mono ${filter === cat ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>
        <div className="flex gap-1 bg-bg-card rounded p-0.5">
          <button onClick={() => setView('grid')} className={`px-2 py-1 rounded text-xs ${view === 'grid' ? 'bg-accent text-bg-primary' : 'text-text-muted'}`}>Grid</button>
          <button onClick={() => setView('table')} className={`px-2 py-1 rounded text-xs ${view === 'table' ? 'bg-accent text-bg-primary' : 'text-text-muted'}`}>Table</button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
      ) : view === 'grid' ? (
        /* Grid View - grouped by category */
        <div className="space-y-6">
          {grouped.map(({ category, items, count }) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{CATEGORY_ICONS[category]}</span>
                <h2 className="text-sm font-mono text-text-muted uppercase">{category}</h2>
                <span className="text-xs font-mono bg-bg-card px-2 py-0.5 rounded text-text-muted">{count}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((asset) => (
                  <div key={asset.id} className="bg-bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{asset.name}</div>
                        {asset.from_contract && (
                          <span className="text-xs font-mono text-accent">from contract</span>
                        )}
                      </div>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${asset.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {asset.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                      <div>
                        <span className="text-text-muted block">Qty</span>
                        <span className="text-text-primary">{asset.quantity}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Price</span>
                        <span className="text-text-primary">{asset.base_price ? `$${Number(asset.base_price).toLocaleString()}` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Sold</span>
                        <span className="text-success">{asset.sold_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Available</span>
                        <InventoryInput
                          value={asset.total_available || 0}
                          onChange={(val) => updateInventoryMutation.mutate({ id: asset.id, total_available: val })}
                        />
                      </div>
                    </div>
                    {/* Inventory bar */}
                    {(asset.total_available || 0) > 0 && (
                      <div className="mb-3">
                        <div className="w-full bg-bg-card rounded-full h-1.5">
                          <div
                            className="bg-accent rounded-full h-1.5 transition-all"
                            style={{ width: `${Math.min(100, ((asset.sold_count || 0) / asset.total_available) * 100)}%` }}
                          />
                        </div>
                        <div className="text-xs font-mono text-text-muted mt-0.5">
                          {asset.sold_count || 0}/{asset.total_available} sold
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingAsset(asset); setShowForm(true) }} className="text-text-muted hover:text-accent text-xs">Edit</button>
                      <button onClick={() => { if (confirm('Delete this asset?')) deleteMutation.mutate(asset.id) }} className="text-text-muted hover:text-danger text-xs">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="text-center text-text-muted text-sm py-12">
              No assets found. Add your first asset or sync from contracts.
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Name</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Category</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Qty</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Price</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Sold</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Available</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Source</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Status</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr key={asset.id} className="border-b border-border last:border-0 hover:bg-bg-card/50">
                  <td className="px-4 py-3 text-text-primary">{asset.name}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                    {CATEGORY_ICONS[asset.category]} {asset.category}
                  </td>
                  <td className="px-4 py-3 text-text-secondary font-mono">{asset.quantity}</td>
                  <td className="px-4 py-3 text-text-primary font-mono">
                    {asset.base_price ? `$${Number(asset.base_price).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-success font-mono">{asset.sold_count || 0}</td>
                  <td className="px-4 py-3">
                    <InventoryInput
                      value={asset.total_available || 0}
                      onChange={(val) => updateInventoryMutation.mutate({ id: asset.id, total_available: val })}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-text-muted">
                    {asset.from_contract ? 'Contract' : 'Manual'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${asset.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {asset.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => { setEditingAsset(asset); setShowForm(true) }} className="text-text-muted hover:text-accent text-xs">Edit</button>
                    <button onClick={() => { if (confirm('Delete this asset?')) deleteMutation.mutate(asset.id) }} className="text-text-muted hover:text-danger text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-text-muted text-sm">
                    No assets found. Add your first asset or sync from contracts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <AssetForm
          asset={editingAsset}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => { setShowForm(false); setEditingAsset(null) }}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  )
}

/* Inline editable inventory count */
function InventoryInput({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  useEffect(() => { setVal(value) }, [value])

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-text-primary font-mono text-xs hover:text-accent cursor-pointer underline decoration-dashed underline-offset-2"
        title="Click to edit available inventory"
      >
        {value}
      </button>
    )
  }

  return (
    <input
      type="number"
      value={val}
      onChange={(e) => setVal(parseInt(e.target.value) || 0)}
      onBlur={() => { onChange(val); setEditing(false) }}
      onKeyDown={(e) => { if (e.key === 'Enter') { onChange(val); setEditing(false) } }}
      autoFocus
      className="w-16 bg-bg-card border border-accent rounded px-1 py-0.5 text-xs font-mono text-text-primary focus:outline-none"
      min={0}
    />
  )
}

/* Guess category from benefit description */
function guessCategory(description) {
  const d = description.toLowerCase()
  if (d.includes('led') || d.includes('board') || d.includes('ribbon') || d.includes('video')) return 'LED Board'
  if (d.includes('jersey') || d.includes('patch') || d.includes('uniform')) return 'Jersey Patch'
  if (d.includes('radio') || d.includes('read') || d.includes('announce') || d.includes('pa ')) return 'Radio Read'
  if (d.includes('social') || d.includes('instagram') || d.includes('twitter') || d.includes('tiktok') || d.includes('post')) return 'Social Post'
  if (d.includes('naming') || d.includes('name')) return 'Naming Right'
  if (d.includes('sign') || d.includes('banner') || d.includes('billboard')) return 'Signage'
  if (d.includes('activation') || d.includes('booth') || d.includes('tent') || d.includes('experience')) return 'Activation Space'
  if (d.includes('digital') || d.includes('web') || d.includes('app') || d.includes('email') || d.includes('newsletter')) return 'Digital'
  return 'Digital' // default
}

function AssetForm({ asset, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: asset?.name || '',
    category: asset?.category || CATEGORIES[0],
    description: asset?.description || '',
    quantity: asset?.quantity || 1,
    base_price: asset?.base_price || '',
    impressions_per_game: asset?.impressions_per_game || '',
    active: asset?.active ?? true,
    notes: asset?.notes || '',
    total_available: asset?.total_available || 0,
    sold_count: asset?.sold_count || 0,
    ...(asset?.id ? { id: asset.id } : {}),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {asset ? 'Edit Asset' : 'New Asset'}
        </h2>
        <div className="space-y-3">
          <input
            placeholder="Asset Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Base Price</label>
              <input
                type="number"
                placeholder="$"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Total Available to Sell</label>
              <input
                type="number"
                value={form.total_available}
                onChange={(e) => setForm({ ...form, total_available: parseInt(e.target.value) || 0 })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                min={0}
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Already Sold</label>
              <input
                type="number"
                value={form.sold_count}
                onChange={(e) => setForm({ ...form, sold_count: parseInt(e.target.value) || 0 })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                min={0}
              />
            </div>
          </div>
          <input
            type="number"
            placeholder="Impressions per Game"
            value={form.impressions_per_game}
            onChange={(e) => setForm({ ...form, impressions_per_game: e.target.value })}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="accent-accent"
            />
            Active
          </label>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name}
            className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onCancel} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm hover:text-text-primary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

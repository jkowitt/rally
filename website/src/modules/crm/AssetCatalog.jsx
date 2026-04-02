import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const CATEGORIES = ['LED Board', 'Jersey Patch', 'Radio Read', 'Social Post', 'Naming Right', 'Signage', 'Activation Space', 'Digital']

export default function AssetCatalog() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [filter, setFilter] = useState('')

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

  const saveMutation = useMutation({
    mutationFn: async (asset) => {
      if (asset.id) {
        const { data, error } = await supabase.from('assets').update(asset).eq('id', asset.id).select().single()
        if (error) throw error
        return data
      }
      const { data, error } = await supabase.from('assets').insert({ ...asset, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
      setShowForm(false)
      setEditingAsset(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets', propertyId] }),
  })

  const filtered = assets?.filter((a) =>
    !filter || a.category === filter
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Asset Catalog</h1>
          <p className="text-text-secondary text-sm mt-1">Manage your sponsorship inventory</p>
        </div>
        <button
          onClick={() => { setEditingAsset(null); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + Add Asset
        </button>
      </div>

      {/* Filter */}
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
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded text-xs font-mono ${filter === cat ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12" />)}
        </div>
      ) : (
        <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Name</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Category</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Qty</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Base Price</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Status</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr key={asset.id} className="border-b border-border last:border-0 hover:bg-bg-card/50">
                  <td className="px-4 py-3 text-text-primary">{asset.name}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">{asset.category}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono">{asset.quantity}</td>
                  <td className="px-4 py-3 text-text-primary font-mono">{asset.base_price ? `$${Number(asset.base_price).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${asset.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {asset.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => { setEditingAsset(asset); setShowForm(true) }}
                      className="text-text-muted hover:text-accent text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this asset?')) deleteMutation.mutate(asset.id) }}
                      className="text-text-muted hover:text-danger text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">
                    No assets found. Add your first asset to get started.
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
            <input
              type="number"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
            <input
              type="number"
              placeholder="Base Price"
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
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

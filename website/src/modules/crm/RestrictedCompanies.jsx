import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { humanError } from '@/lib/humanError'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Badge, EmptyState } from '@/components/ui'
import { Lock, Plus, Trash2, UserPlus, X, Shield } from 'lucide-react'

// /app/crm/restricted-companies
//
// Admin-only block list for HQ-managed accounts. Adding a company
// here prevents reps from adding it to their pipeline (the DB
// trigger enforces it) unless an admin assigns the restriction to
// a specific rep. Name matching is fuzzy via normalize_brand_name
// — "Acme Inc.", "Acme Corp.", "ACME" all collide on the same
// normalized form, so aliases are usually unnecessary but supported
// for the edge cases (DBA names, prior trade names, etc.).
//
// Access: admins + developers only. Reps who somehow reach this
// route get redirected back to /app.
export default function RestrictedCompanies() {
  const { profile, isDeveloper } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'developer' || isDeveloper

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  if (profile && !isAdmin) return <Navigate to="/app" replace />

  const { data: restrictions, isLoading } = useQuery({
    queryKey: ['restricted-companies', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restricted_companies')
        .select('*, assigned_to:assigned_to_user_id (id, full_name, email), created_by_user:created_by (full_name, email)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: teamUsers } = useQuery({
    queryKey: ['team-users-for-assignment', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('property_id', propertyId)
        .order('full_name')
      return data || []
    },
  })

  const { data: recentViolations } = useQuery({
    queryKey: ['restriction-violations', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('restriction_violations')
        .select('id, attempted_brand_name, source, created_at, user_id, matched_restriction_id, user:user_id (full_name, email)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
  })

  const save = useMutation({
    mutationFn: async (payload) => {
      const aliases = (payload.aliases || '')
        .split(/[\n,]/)
        .map(s => s.trim())
        .filter(Boolean)
      const row = {
        property_id: propertyId,
        brand_name: payload.brand_name.trim(),
        aliases,
        reason: payload.reason?.trim() || null,
        assigned_to_user_id: payload.assigned_to_user_id || null,
        assigned_at: payload.assigned_to_user_id ? new Date().toISOString() : null,
        assigned_by: payload.assigned_to_user_id ? profile?.id : null,
        assigned_reason: payload.assigned_reason?.trim() || null,
      }
      if (payload.id) {
        const { error } = await supabase.from('restricted_companies').update(row).eq('id', payload.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('restricted_companies').insert({ ...row, created_by: profile?.id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restricted-companies', propertyId] })
      toast({ title: 'Restriction saved', type: 'success' })
      setShowAdd(false)
      setEditing(null)
    },
    onError: (err) => {
      // Friendlier message if they tripped the unique constraint
      // (same normalized name already restricted).
      const msg = humanError(err)
      const isDup = /duplicate key|unique constraint|idx_restricted_property_brand/i.test(msg)
      toast({
        title: isDup ? 'Already restricted' : 'Could not save',
        description: isDup ? 'A restriction with that brand name (or an equivalent variant) already exists.' : msg,
        type: 'error',
      })
    },
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('restricted_companies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restricted-companies', propertyId] })
      toast({ title: 'Restriction removed', type: 'success' })
    },
    onError: (err) => toast({ title: 'Could not remove', description: humanError(err), type: 'error' }),
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <Breadcrumbs items={[{ label: 'CRM', to: '/app' }, { label: 'Restricted Companies' }]} />

      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Restricted Companies
          </h1>
          <p className="text-[12px] text-text-muted mt-1 max-w-2xl leading-relaxed">
            HQ-managed accounts that reps can't add to their pipeline. Name matching is fuzzy — "Acme", "Acme Inc.", "ACME Corp." all collide. Assign a restriction to a specific rep to let only that rep work the account.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setShowAdd(true) }}>
          <Plus className="w-3.5 h-3.5" /> Add restriction
        </Button>
      </header>

      {isLoading && <div className="text-xs text-text-muted py-6 text-center">Loading…</div>}

      {!isLoading && (restrictions?.length || 0) === 0 && (
        <EmptyState
          icon={<Lock className="w-8 h-8 text-text-muted" />}
          title="No restricted companies yet"
          description="Add an account here and reps will be blocked from adding it to their pipeline. Use it for national accounts managed centrally, agency-of-record deals, or anything you want to keep off the rep floor."
          primaryAction={
            <Button size="lg" onClick={() => { setEditing(null); setShowAdd(true) }}>
              <Plus className="w-4 h-4" /> Add the first restriction
            </Button>
          }
        />
      )}

      <div className="space-y-2">
        {(restrictions || []).map(r => (
          <RestrictionRow
            key={r.id}
            row={r}
            onEdit={() => { setEditing(r); setShowAdd(true) }}
            onRemove={() => { if (confirm(`Remove the restriction on ${r.brand_name}?`)) remove.mutate(r.id) }}
          />
        ))}
      </div>

      {recentViolations && recentViolations.length > 0 && (
        <section className="bg-bg-card border border-border rounded-lg p-4 mt-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Recent blocked attempts</div>
          <ul className="divide-y divide-border">
            {recentViolations.map(v => (
              <li key={v.id} className="py-2 flex items-center justify-between gap-3 text-[11px]">
                <span className="text-text-secondary truncate">
                  <strong className="text-text-primary">{v.user?.full_name || v.user?.email || 'A rep'}</strong>
                  {' '}tried to add{' '}
                  <strong className="text-text-primary">{v.attempted_brand_name}</strong>
                  <span className="text-text-muted"> · {v.source}</span>
                </span>
                <span className="text-text-muted font-mono shrink-0">{new Date(v.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showAdd && (
        <RestrictionDialog
          row={editing}
          teamUsers={teamUsers || []}
          onCancel={() => { setShowAdd(false); setEditing(null) }}
          onSave={(payload) => save.mutate({ ...payload, id: editing?.id })}
          saving={save.isPending}
        />
      )}
    </div>
  )
}

function RestrictionRow({ row, onEdit, onRemove }) {
  const aliasList = (row.aliases || []).filter(Boolean)
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
            <h3 className="text-sm font-semibold text-text-primary">{row.brand_name}</h3>
            {row.assigned_to ? (
              <Badge tone="info">
                <UserPlus className="w-3 h-3 inline mr-1" />
                assigned to {row.assigned_to.full_name || row.assigned_to.email}
              </Badge>
            ) : (
              <Badge tone="warning">Blocked for all reps</Badge>
            )}
          </div>
          {row.reason && (
            <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">{row.reason}</p>
          )}
          {aliasList.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Also blocks:</span>
              {aliasList.map((a, i) => (
                <span key={i} className="text-[10px] font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">{a}</span>
              ))}
            </div>
          )}
          <div className="text-[10px] text-text-muted mt-1.5">
            added {new Date(row.created_at).toLocaleDateString()}
            {row.created_by_user?.full_name && <span> · by {row.created_by_user.full_name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
          <button
            onClick={onRemove}
            className="text-[10px] border border-danger/30 text-danger px-2 py-1.5 rounded hover:bg-danger/10"
            aria-label="Remove restriction"
          >
            <Trash2 className="w-3 h-3 inline" />
          </button>
        </div>
      </div>
    </div>
  )
}

function RestrictionDialog({ row, teamUsers, onCancel, onSave, saving }) {
  const [form, setForm] = useState({
    brand_name: row?.brand_name || '',
    aliases: (row?.aliases || []).join('\n'),
    reason: row?.reason || '',
    assigned_to_user_id: row?.assigned_to_user_id || '',
    assigned_reason: row?.assigned_reason || '',
  })
  const inputClass = 'w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent'

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.brand_name.trim()) return
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-bg-surface border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">
            {row ? 'Edit restriction' : 'Add restriction'}
          </h2>
          <button type="button" onClick={onCancel} className="text-text-muted hover:text-text-primary p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Brand / company name *</label>
            <input
              value={form.brand_name}
              onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
              placeholder="e.g. Acme Corporation"
              className={`${inputClass} mt-1`}
              required
              autoFocus
            />
            <p className="text-[10px] text-text-muted mt-1">
              Fuzzy matched — "Acme", "Acme Inc.", "Acme Corp." all collide automatically. Add aliases below only if the company goes by something noticeably different.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Aliases (one per line)</label>
            <textarea
              value={form.aliases}
              onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              rows={3}
              placeholder="ACME Holdings&#10;Roadrunner Innovations&#10;Wile E. Coyote Industries"
              className={`${inputClass} mt-1 resize-none font-mono text-[12px]`}
            />
            <p className="text-[10px] text-text-muted mt-1">
              For DBA names, prior trade names, or parent companies. Each line gets its own fuzzy match.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Why is this restricted?</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={2}
              placeholder="National account managed by HQ. Agency-of-record handles all renewals."
              className={`${inputClass} mt-1 resize-none`}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Assign to a rep (optional)</label>
            <select
              value={form.assigned_to_user_id}
              onChange={(e) => setForm({ ...form, assigned_to_user_id: e.target.value })}
              className={`${inputClass} mt-1`}
            >
              <option value="">— Blocked for all reps —</option>
              {teamUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} ({u.role})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-text-muted mt-1">
              When assigned, only that rep can add this company to their pipeline. Everyone else still gets the block.
            </p>
          </div>

          {form.assigned_to_user_id && (
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Assignment note (optional)</label>
              <input
                value={form.assigned_reason}
                onChange={(e) => setForm({ ...form, assigned_reason: e.target.value })}
                placeholder="e.g. Existing relationship — exception approved 5/12/2026"
                className={`${inputClass} mt-1`}
              />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={saving || !form.brand_name.trim()}>
            {saving ? 'Saving…' : row ? 'Save changes' : 'Add restriction'}
          </Button>
        </div>
      </form>
    </div>
  )
}

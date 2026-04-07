import { useState, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useToast } from '@/components/Toast'
import { Navigate } from 'react-router-dom'
import APIUsageBanner from '@/components/APIUsageBanner'
import { logAudit } from '@/lib/audit'

const CRMDataImporter = lazy(() => import('@/components/CRMDataImporter'))
const ROLES = ['developer', 'admin', 'rep']
const PLANS = ['free', 'starter', 'pro', 'enterprise']

export default function DeveloperDashboard() {
  const { isDeveloper, profile } = useAuth()
  const { flags, toggleFlag } = useFeatureFlags()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [editingUser, setEditingUser] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [runningAnalysis, setRunningAnalysis] = useState(false)
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkPlan, setNewLinkPlan] = useState('pro')
  const [showCRMImporter, setShowCRMImporter] = useState(false)
  const [showCreateProperty, setShowCreateProperty] = useState(false)
  const [newPropName, setNewPropName] = useState('')
  const [newPropType, setNewPropType] = useState('college')
  const [newPropCity, setNewPropCity] = useState('')
  const [newPropState, setNewPropState] = useState('')
  const [newPropPlan, setNewPropPlan] = useState('free')

  if (!isDeveloper) return <Navigate to="/app" replace />

  const { data: properties } = useQuery({
    queryKey: ['dev-properties'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
      return data || []
    },
    refetchInterval: 10000, // every 10 seconds
  })

  const { data: profiles } = useQuery({
    queryKey: ['dev-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*, properties!profiles_property_id_fkey(*)').order('created_at', { ascending: false })
      if (error) { console.error('Profiles query error:', error); return [] }
      return data || []
    },
    refetchInterval: 10000,
  })

  const { data: invitations } = useQuery({
    queryKey: ['dev-invitations'],
    queryFn: async () => {
      const { data } = await supabase.from('invitations').select('*, properties(name)').order('created_at', { ascending: false }).limit(50)
      return data || []
    },
    refetchInterval: 30000,
  })

  const { data: apiUsage } = useQuery({
    queryKey: ['dev-api-usage'],
    queryFn: async () => {
      const { data } = await supabase.from('api_usage').select('service, credits_used').gte('called_at', new Date(Date.now() - 30 * 86400000).toISOString())
      if (!data) return {}
      const grouped = {}
      data.forEach(u => { grouped[u.service] = (grouped[u.service] || 0) + (u.credits_used || 1) })
      return grouped
    },
  })

  // Code analysis reports
  const { data: analysisReports } = useQuery({
    queryKey: ['dev-analysis'],
    queryFn: async () => {
      const { data } = await supabase.from('code_analysis_reports').select('*').order('run_date', { ascending: false }).limit(14)
      return data || []
    },
  })

  // Feature suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['dev-suggestions'],
    queryFn: async () => {
      const { data } = await supabase.from('feature_suggestions').select('*').order('created_at', { ascending: false })
      return data || []
    },
  })

  // Premium invite links (table may not exist if migration 025 hasn't run)
  const { data: premiumLinks } = useQuery({
    queryKey: ['dev-premium-links'],
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_invite_links').select('*, properties(name)').order('created_at', { ascending: false })
      if (error) return [] // table may not exist yet
      return data || []
    },
  })

  const createPremiumLinkMutation = useMutation({
    mutationFn: async ({ label, plan }) => {
      const { data, error } = await supabase.from('premium_invite_links').insert({
        label, plan, created_by: profile?.id,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dev-premium-links'] })
      const url = `${window.location.origin}/login?premium=${data.token}`
      navigator.clipboard.writeText(url)
      toast({ title: 'Premium link created & copied!', type: 'success' })
      setNewLinkLabel('')
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  const revokePremiumLinkMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('premium_invite_links').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-premium-links'] })
      toast({ title: 'Link revoked', type: 'success' })
    },
  })

  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('feature_suggestions').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-suggestions'] })
      toast({ title: 'Suggestion updated', type: 'success' })
    },
  })

  // Custom dashboard requests
  const { data: customRequests } = useQuery({
    queryKey: ['dev-custom-requests'],
    queryFn: async () => {
      const { data } = await supabase.from('custom_dashboard_requests').select('*, properties(name)').order('created_at', { ascending: false })
      return data || []
    },
  })

  const updateCustomRequestMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('custom_dashboard_requests').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-custom-requests'] })
      toast({ title: 'Request updated', type: 'success' })
    },
  })

  const createPropertyMutation = useMutation({
    mutationFn: async ({ name, type, city, state, plan }) => {
      const { data, error } = await supabase.from('properties').insert({
        name, type, city: city || null, state: state || null, plan,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dev-properties'] })
      toast({ title: `Property "${data.name}" created`, type: 'success' })
      setShowCreateProperty(false)
      setNewPropName('')
      setNewPropCity('')
      setNewPropState('')
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  const deletePropertyMutation = useMutation({
    mutationFn: async (id) => {
      // Unlink users first
      await supabase.from('profiles').update({ property_id: null }).eq('property_id', id)
      const { error } = await supabase.from('properties').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-properties'] })
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'Property deleted', type: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  // Overage pricing
  const { data: overagePricing } = useQuery({
    queryKey: ['dev-overage-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase.from('overage_pricing').select('*').order('service')
      if (error) return []
      return data || []
    },
  })

  const updateOverageMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('overage_pricing').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-overage-pricing'] })
      toast({ title: 'Pricing updated', type: 'success' })
    },
  })

  async function runCodeAnalysis() {
    setRunningAnalysis(true)
    try {
      const { data, error } = await supabase.functions.invoke('code-analysis', { body: { action: 'run_analysis' } })
      if (error) throw error
      if (data?.error) toast({ title: 'Analysis error', description: data.error, type: 'warning' })
      else toast({ title: 'Analysis complete', type: 'success' })
      queryClient.invalidateQueries({ queryKey: ['dev-analysis'] })
    } catch (e) {
      toast({ title: 'Analysis failed', description: e.message, type: 'error' })
    }
    setRunningAnalysis(false)
  }

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
      if (error) throw error
      logAudit({ action: 'role_change', entityType: 'profile', entityId: userId, changes: { role: { new: role } } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'Role updated', type: 'success' })
      setEditingUser(null)
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('properties').update(updates).eq('id', id)
      if (error) throw error
      logAudit({ action: updates.plan ? 'plan_change' : 'update', entityType: 'property', entityId: id, changes: updates })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-properties'] })
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'Plan updated', type: 'success' })
    },
  })

  // Contact research cache analytics
  const { data: contactCache } = useQuery({
    queryKey: ['dev-contact-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_research')
        .select('company_name, source, fetched_at, expires_at, data')
        .order('fetched_at', { ascending: false })
        .limit(200)
      if (error) return []
      // Group by company and count pulls
      const companies = {}
      for (const row of (data || [])) {
        const key = row.company_name.toLowerCase().trim()
        if (!companies[key]) {
          companies[key] = {
            name: row.company_name,
            source: row.source,
            lastFetched: row.fetched_at,
            expiresAt: row.expires_at,
            contactCount: row.data?.contacts?.length || 0,
            pullCount: 0,
          }
        }
        companies[key].pullCount++
      }
      return Object.values(companies).sort((a, b) => b.pullCount - a.pullCount)
    },
  })

  // Usage log per company (how many times searched across all users)
  const { data: lookupCounts } = useQuery({
    queryKey: ['dev-lookup-counts'],
    queryFn: async () => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('api_usage')
        .select('endpoint, credits_used, called_at')
        .in('service', ['apollo', 'hunter'])
        .gte('called_at', startOfMonth.toISOString())
      return {
        total: (data || []).length,
        credits: (data || []).reduce((s, r) => s + (r.credits_used || 1), 0),
      }
    },
  })

  const assignPropertyMutation = useMutation({
    mutationFn: async ({ userId, propertyId }) => {
      const { error } = await supabase.from('profiles').update({ property_id: propertyId }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'Property assigned', type: 'success' })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-profiles'] })
      toast({ title: 'User removed', type: 'success' })
    },
  })

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'invites', label: `Invite Links (${(premiumLinks || []).filter(l => l.active && !l.claimed_by && new Date(l.expires_at) > new Date()).length})` },
    { id: 'properties', label: `Properties (${properties?.length || 0})` },
    { id: 'users', label: `Users (${profiles?.length || 0})` },
    { id: 'flags', label: 'Feature Flags' },
    { id: 'api', label: 'API Usage' },
    { id: 'health', label: `Code Health (${analysisReports?.length || 0})` },
    { id: 'suggestions', label: `Suggestions (${(suggestions || []).filter(s => s.status === 'new').length || 0})` },
    { id: 'cache', label: `Contact Cache (${(contactCache || []).length})` },
    { id: 'custom', label: 'Custom Dashboards' },
  ]

  const roleColor = { developer: 'bg-accent/20 text-accent', admin: 'bg-warning/20 text-warning', rep: 'bg-bg-card text-text-muted' }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Developer Admin</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Full platform control &middot; {properties?.length || 0} properties &middot; {profiles?.length || 0} users
          </p>
        </div>
        <button
          onClick={() => setShowCRMImporter(true)}
          className="bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded text-sm font-medium hover:bg-accent/20 transition-colors"
        >
          Import CRM Data
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Properties" value={properties?.length || 0} color="text-accent" />
        <StatCard label="Total Users" value={profiles?.length || 0} color="text-text-primary" />
        <StatCard label="Admins" value={(profiles || []).filter(p => p.role === 'admin').length || 0} color="text-warning" />
        <StatCard label="Pending Invites" value={(invitations || []).filter(i => !i.accepted).length || 0} color="text-text-muted" />
      </div>

      {/* API Usage Banner */}
      <APIUsageBanner />

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-card rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* All Signups - Real-Time */}
          <Panel title={`All Signups (${profiles?.length || 0}) — live`}>
            <div className="text-[9px] text-text-muted font-mono mb-2">Auto-refreshes every 10 seconds</div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {profiles?.map(p => {
                const plan = p.properties?.plan || 'free'
                const planColors = { free: 'bg-bg-card text-text-muted', starter: 'bg-warning/10 text-warning', pro: 'bg-accent/10 text-accent', enterprise: 'bg-success/10 text-success' }
                const trialEnds = p.properties?.trial_ends_at ? new Date(p.properties.trial_ends_at) : null
                const trialActive = trialEnds && trialEnds > new Date()
                const trialDays = trialActive ? Math.ceil((trialEnds - new Date()) / 86400000) : 0
                return (
                  <div key={p.id} className="bg-bg-card border border-border rounded-lg px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm text-text-primary font-medium truncate">{p.full_name || p.id.slice(0, 8)}</span>
                          <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${roleColor[p.role]}`}>{p.role}</span>
                          <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${planColors[plan]}`}>{plan}</span>
                          {trialActive && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-accent/10 text-accent">{trialDays}d trial</span>}
                        </div>
                        <div className="flex gap-2 text-[10px] text-text-muted mt-0.5 flex-wrap">
                          <span>{p.email || '—'}</span>
                          <span>{p.properties?.name || 'No property'}</span>
                          <span>{p.created_at ? new Date(p.created_at).toLocaleDateString() + ' ' + new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <select
                          value={plan}
                          onChange={(e) => {
                            if (p.property_id) {
                              updatePropertyMutation.mutate({ id: p.property_id, updates: { plan: e.target.value } })
                            } else {
                              toast({ title: 'No property linked', description: 'This user needs a property first', type: 'warning' })
                            }
                          }}
                          className={`border rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-accent ${planColors[plan]}`}
                        >
                          {PLANS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                        </select>
                        <select
                          value={p.role}
                          onChange={(e) => updateRoleMutation.mutate({ userId: p.id, role: e.target.value })}
                          className="bg-bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!profiles || profiles.length === 0) && (
                <div className="text-text-muted text-xs text-center py-8">No signups yet. Share your signup link to get started.</div>
              )}
            </div>
          </Panel>

          {/* Feature Flags */}
          <Panel title="Feature Flags">
            <div className="space-y-2">
              {Object.entries(flags).map(([module, enabled]) => (
                <div key={module} className="flex items-center justify-between py-2">
                  <span className="text-sm text-text-primary font-mono">{module}</span>
                  <button
                    onClick={() => toggleFlag(module)}
                    className={`px-3 py-1 rounded text-xs font-mono ${enabled ? 'bg-success/20 text-success' : 'bg-bg-card text-text-muted'}`}
                  >
                    {enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          {/* API Usage (30 days) */}
          <Panel title="API Usage (30 days)">
            {apiUsage && Object.keys(apiUsage).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(apiUsage).map(([service, credits]) => (
                  <div key={service} className="flex items-center justify-between py-1">
                    <span className="text-sm text-text-primary capitalize">{service}</span>
                    <span className="text-xs text-accent font-mono">{credits} credits</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted">No API usage recorded</div>
            )}
          </Panel>

          {/* Pending Invitations */}
          <Panel title="Pending Invitations">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(invitations || []).filter(i => !i.accepted).slice(0, 10).map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-text-primary">{inv.email}</span>
                  <span className="text-text-muted">{inv.properties?.name} &middot; {inv.role}</span>
                </div>
              ))}
              {(invitations || []).filter(i => !i.accepted).length === 0 && (
                <div className="text-text-muted text-xs">No pending invitations</div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* INVITE LINKS */}
      {activeTab === 'invites' && (
        <div className="space-y-4">
          <Panel title="Generate Premium Access Link">
            <p className="text-xs text-text-muted mb-3">
              Create a link that gives a company premium plan access when they sign up. Links expire after 48 hours.
            </p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Label (e.g. 'NIU Athletics pilot')"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent min-w-[200px]"
              />
              <select
                value={newLinkPlan}
                onChange={(e) => setNewLinkPlan(e.target.value)}
                className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <button
                onClick={() => createPremiumLinkMutation.mutate({ label: newLinkLabel || 'Unnamed', plan: newLinkPlan })}
                disabled={createPremiumLinkMutation.isPending}
                className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {createPremiumLinkMutation.isPending ? 'Creating...' : 'Generate & Copy Link'}
              </button>
            </div>
          </Panel>

          <Panel title={`All Links (${premiumLinks?.length || 0})`}>
            <div className="space-y-2">
              {premiumLinks?.map(link => {
                const isExpired = new Date(link.expires_at) < new Date()
                const isClaimed = !!link.claimed_by
                const isActive = link.active && !isExpired && !isClaimed
                const status = !link.active ? 'Revoked' : isClaimed ? 'Claimed' : isExpired ? 'Expired' : 'Active'
                const statusColor = { Active: 'bg-success/10 text-success', Claimed: 'bg-accent/10 text-accent', Expired: 'bg-bg-card text-text-muted', Revoked: 'bg-danger/10 text-danger' }
                const url = `${window.location.origin}/login?premium=${link.token}`
                return (
                  <div key={link.id} className={`bg-bg-card border rounded-lg px-4 py-3 ${isActive ? 'border-success/30' : 'border-border'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-text-primary font-medium">{link.label || 'Unnamed'}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${statusColor[status]}`}>{status}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">{link.plan}</span>
                        </div>
                        <div className="text-[10px] text-text-muted mt-1 flex gap-3 flex-wrap">
                          <span>Created {new Date(link.created_at).toLocaleDateString()}</span>
                          <span>Expires {new Date(link.expires_at).toLocaleDateString()} {new Date(link.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isClaimed && link.properties?.name && <span>Claimed by: {link.properties.name}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {isActive && (
                          <>
                            <button
                              onClick={() => { navigator.clipboard.writeText(url); toast({ title: 'Link copied!', type: 'success' }) }}
                              className="text-[10px] text-accent hover:underline font-mono"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => { if (confirm('Revoke this link?')) revokePremiumLinkMutation.mutate(link.id) }}
                              className="text-[10px] text-danger hover:underline font-mono"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!premiumLinks || premiumLinks.length === 0) && (
                <div className="text-text-muted text-xs text-center py-6">No invite links created yet.</div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* PROPERTIES */}
      {activeTab === 'properties' && (
        <div className="space-y-3">
          {/* Create Property */}
          {showCreateProperty ? (
            <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">Create New Property / Company</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Company Name *" value={newPropName} onChange={(e) => setNewPropName(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" autoFocus />
                <select value={newPropType} onChange={(e) => setNewPropType(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  <option value="college">College Athletics</option>
                  <option value="professional">Professional Team</option>
                  <option value="minor_league">Minor League</option>
                  <option value="agency">Agency</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="conference">Conference</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="media">Media</option>
                  <option value="realestate">Real Estate</option>
                  <option value="other">Other</option>
                </select>
                <input placeholder="City" value={newPropCity} onChange={(e) => setNewPropCity(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
                <input placeholder="State" value={newPropState} onChange={(e) => setNewPropState(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
                <select value={newPropPlan} onChange={(e) => setNewPropPlan(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (!newPropName.trim()) return; createPropertyMutation.mutate({ name: newPropName.trim(), type: newPropType, city: newPropCity, state: newPropState, plan: newPropPlan }) }}
                  disabled={!newPropName.trim() || createPropertyMutation.isPending}
                  className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {createPropertyMutation.isPending ? 'Creating...' : 'Create Property'}
                </button>
                <button onClick={() => setShowCreateProperty(false)} className="text-text-muted text-sm hover:text-text-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCreateProperty(true)} className="bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded text-sm font-medium hover:bg-accent/20 transition-colors">
              + Create Property
            </button>
          )}

          {/* Property List */}
          {properties?.map(p => {
            const propUsers = (profiles || []).filter(pr => pr.property_id === p.id)
            const unassignedUsers = (profiles || []).filter(pr => !pr.property_id)
            const trialEnds = p.trial_ends_at ? new Date(p.trial_ends_at) : null
            const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / 86400000)) : null
            const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0
            const trialActive = trialDaysLeft !== null && trialDaysLeft > 0
            return (
            <div key={p.id} className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">{p.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{p.type || 'college'}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      p.plan === 'pro' ? 'bg-accent/20 text-accent' :
                      p.plan === 'enterprise' ? 'bg-success/20 text-success' :
                      p.plan === 'starter' ? 'bg-warning/20 text-warning' :
                      'bg-bg-card text-text-muted'
                    }`}>{p.plan || 'free'}</span>
                    {trialActive && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">{trialDaysLeft}d trial left</span>
                    )}
                    {trialExpired && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-danger/10 text-danger">Trial expired</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-text-muted font-mono flex-wrap">
                    {p.city && <span>{p.city}{p.state ? `, ${p.state}` : ''}</span>}
                    {p.sport && <span>{p.sport}</span>}
                    {p.billing_email && <span>{p.billing_email}</span>}
                    <span>{propUsers.length} user{propUsers.length !== 1 ? 's' : ''}</span>
                    <span className="text-[9px]">ID: {p.id.slice(0, 8)}</span>
                    {trialEnds && <span className="text-[9px]">Trial ends: {trialEnds.toLocaleDateString()}</span>}
                  </div>
                  {/* Users at this company */}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {propUsers.map(u => (
                      <span key={u.id} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${roleColor[u.role] || 'bg-bg-card text-text-muted'}`}>
                        {u.full_name || u.email || u.id.slice(0, 6)} ({u.role})
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex gap-2">
                    <select
                      value={p.plan || 'free'}
                      onChange={(e) => updatePropertyMutation.mutate({ id: p.id, updates: { plan: e.target.value } })}
                      className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                    >
                      {PLANS.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                    </select>
                    <select
                      value={p.type || 'college'}
                      onChange={(e) => updatePropertyMutation.mutate({ id: p.id, updates: { type: e.target.value } })}
                      className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="college">College</option>
                      <option value="professional">Professional</option>
                      <option value="minor_league">Minor League</option>
                      <option value="agency">Agency</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="conference">Conference</option>
                      <option value="nonprofit">Nonprofit</option>
                      <option value="media">Media</option>
                      <option value="realestate">Real Estate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {/* Trial days control */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-text-muted shrink-0">Trial:</span>
                    {[7, 14, 30, 60, 90].map(days => (
                      <button
                        key={days}
                        onClick={() => {
                          const newEnd = new Date(Date.now() + days * 86400000).toISOString()
                          updatePropertyMutation.mutate({ id: p.id, updates: { trial_ends_at: newEnd, trial_started_at: p.trial_started_at || new Date().toISOString() } })
                        }}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                          trialDaysLeft !== null && Math.abs(trialDaysLeft - days) < 2
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-text-muted hover:border-accent/50 hover:text-text-primary'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const custom = prompt('Set trial days from today:', '30')
                        if (custom && !isNaN(custom)) {
                          const newEnd = new Date(Date.now() + Number(custom) * 86400000).toISOString()
                          updatePropertyMutation.mutate({ id: p.id, updates: { trial_ends_at: newEnd, trial_started_at: p.trial_started_at || new Date().toISOString() } })
                        }
                      }}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border text-text-muted hover:border-accent/50 hover:text-text-primary"
                    >
                      Custom
                    </button>
                    {trialActive && (
                      <button
                        onClick={() => {
                          if (!confirm(`End trial for "${p.name}" immediately?`)) return
                          updatePropertyMutation.mutate({ id: p.id, updates: { trial_ends_at: new Date().toISOString() } })
                        }}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-danger/30 text-danger hover:bg-danger/10"
                      >
                        End trial
                      </button>
                    )}
                  </div>
                  {/* Assign user to this property */}
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) assignPropertyMutation.mutate({ userId: e.target.value, propertyId: p.id }) }}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">+ Assign user...</option>
                    {(profiles || []).filter(pr => pr.property_id !== p.id).map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email || u.id.slice(0, 8)} {u.properties?.name ? `(${u.properties.name})` : '(unassigned)'}</option>
                    ))}
                  </select>
                  {propUsers.length === 0 && (
                    <button
                      onClick={() => { if (confirm(`Delete "${p.name}"? This cannot be undone.`)) deletePropertyMutation.mutate(p.id) }}
                      className="text-[10px] text-danger hover:underline text-right"
                    >
                      Delete property
                    </button>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* USERS */}
      {activeTab === 'users' && (
        <div className="space-y-2">
          <div className="text-xs text-text-muted mb-2">
            Manage all users. Change roles, reassign companies, or disable accounts. First user at each company is auto-assigned admin.
          </div>
          {profiles?.map(p => {
            const isDisabled = p.role === 'disabled'
            return (
            <div key={p.id} className={`bg-bg-surface border rounded-lg px-4 py-3 ${isDisabled ? 'border-danger/30 opacity-60' : 'border-border'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-primary">{p.full_name || p.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${roleColor[p.role] || 'bg-danger/20 text-danger'}`}>{p.role}</span>
                    {isDisabled && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-danger/10 text-danger">DISABLED</span>}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 flex gap-2 flex-wrap">
                    <span>{p.email || p.id.slice(0, 12)}</span>
                    <span>{p.properties?.name || 'No company'}</span>
                    {p.properties?.city && <span>{p.properties.city}{p.properties.state ? `, ${p.properties.state}` : ''}</span>}
                    {p.properties?.type && <span className="text-[10px] font-mono">{p.properties.type}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <select
                    value={p.role}
                    onChange={(e) => updateRoleMutation.mutate({ userId: p.id, role: e.target.value })}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                  >
                    {[...ROLES, 'disabled'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select
                    value={p.property_id || ''}
                    onChange={(e) => assignPropertyMutation.mutate({ userId: p.id, propertyId: e.target.value || null })}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent max-w-[140px]"
                  >
                    <option value="">No company</option>
                    {properties?.map(prop => <option key={prop.id} value={prop.id}>{prop.name}</option>)}
                  </select>
                  {p.id !== profile?.id && (
                    <button
                      onClick={() => { if (confirm(`Permanently delete ${p.full_name || 'this user'}? This removes all their data.`)) deleteUserMutation.mutate(p.id) }}
                      className="text-text-muted hover:text-danger text-xs px-1"
                      title="Delete user"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* FLAGS */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          <Panel title="Module Visibility">
            <p className="text-xs text-text-muted mb-4">Toggle entire sidebar modules on/off for all users.</p>
            <div className="space-y-3">
              {Object.entries(flags).map(([module, enabled]) => (
                <div key={module} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm text-text-primary font-mono capitalize">{module}</span>
                    <span className="text-xs text-text-muted ml-2">
                      {module === 'crm' ? 'Pipeline, contracts, assets, fulfillment' :
                       module === 'sportify' ? 'Events, activations, run-of-show' :
                       module === 'valora' ? 'AI media valuations' :
                       module === 'businessnow' ? 'Intelligence, alerts, newsletter' : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleFlag(module)}
                    className={`px-4 py-1.5 rounded text-xs font-mono font-medium ${enabled ? 'bg-success/20 text-success border border-success/30' : 'bg-bg-card text-text-muted border border-border'}`}
                  >
                    {enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="AI Feature Toggles">
            <p className="text-xs text-text-muted mb-4">Disable individual AI features across the platform. Useful for maintenance or when edge functions are down.</p>
            <div className="space-y-3">
              {[
                { key: 'ai_newsletter', label: 'Newsletter Generation', desc: 'AI-generated weekly/daily newsletters' },
                { key: 'ai_insights', label: 'AI Deal Insights', desc: 'Pipeline forecasts, deal analysis, email drafting' },
                { key: 'ai_prospect_search', label: 'Prospect Search', desc: 'AI-powered prospect and contact research' },
                { key: 'ai_contract_analysis', label: 'Contract Analysis', desc: 'AI reads and extracts benefits from contracts' },
                { key: 'ai_valuation', label: 'VALORA Valuations', desc: 'AI media value estimation' },
                { key: 'ai_daily_briefing', label: 'Daily Intelligence', desc: 'BusinessNow AI briefing generation' },
              ].map(feat => {
                const isOn = localStorage.getItem(`ll_flag_${feat.key}`) !== 'off'
                return (
                  <div key={feat.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="text-sm text-text-primary">{feat.label}</span>
                      <span className="text-xs text-text-muted ml-2">{feat.desc}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = isOn ? 'off' : 'on'
                        localStorage.setItem(`ll_flag_${feat.key}`, newVal)
                        // Broadcast to other tabs
                        window.dispatchEvent(new StorageEvent('storage', { key: `ll_flag_${feat.key}`, newValue: newVal }))
                        toast({ title: `${feat.label}: ${newVal === 'off' ? 'DISABLED' : 'ENABLED'}`, type: newVal === 'off' ? 'warning' : 'success' })
                        // Force re-render
                        queryClient.invalidateQueries()
                      }}
                      className={`px-4 py-1.5 rounded text-xs font-mono font-medium ${isOn ? 'bg-success/20 text-success border border-success/30' : 'bg-danger/20 text-danger border border-danger/30'}`}
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* API USAGE */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          <Panel title="API Credit Usage (Last 30 Days)">
            {apiUsage && Object.keys(apiUsage).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(apiUsage).map(([service, credits]) => (
                  <div key={service} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-text-primary capitalize font-medium">{service}</span>
                      <span className="text-xs text-text-muted ml-2">
                        {service === 'apollo' ? '500 credits/mo on Basic' :
                         service === 'hunter' ? '500 verifications/mo on Starter' :
                         service === 'claude' ? 'Usage-based' : ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-accent font-mono">{credits}</div>
                      <div className="text-[10px] text-text-muted">credits used</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted py-4 text-center">No API usage in the last 30 days</div>
            )}
          </Panel>
          <Panel title="Overage Pricing (Non-Enterprise)">
            <p className="text-xs text-text-muted mb-3">Set included usage per plan and overage cost per additional request. Enterprise plans have unlimited usage at no extra charge.</p>
            <div className="space-y-1">
              <div className="hidden sm:grid sm:grid-cols-[1.5fr_0.8fr_0.8fr_0.5fr] gap-2 px-2 py-1 text-[10px] font-mono text-text-muted uppercase">
                <span>Feature</span>
                <span>Included/mo</span>
                <span>Overage $/ea</span>
                <span>Active</span>
              </div>
              {(overagePricing || []).map(item => (
                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1.5fr_0.8fr_0.8fr_0.5fr] gap-2 items-center bg-bg-card border border-border rounded px-3 py-2">
                  <span className="text-sm text-text-primary">{item.label || item.service}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={item.included_qty}
                      onChange={(e) => updateOverageMutation.mutate({ id: item.id, updates: { included_qty: parseInt(e.target.value) || 0 } })}
                      className="w-16 bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-accent text-center"
                    />
                    <span className="text-[10px] text-text-muted">/mo</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-text-muted">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={(item.overage_price_cents / 100).toFixed(2)}
                      onChange={(e) => updateOverageMutation.mutate({ id: item.id, updates: { overage_price_cents: Math.round(parseFloat(e.target.value) * 100) || 0 } })}
                      className="w-16 bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-accent text-center"
                    />
                    <span className="text-[10px] text-text-muted">/ea</span>
                  </div>
                  <button
                    onClick={() => updateOverageMutation.mutate({ id: item.id, updates: { active: !item.active } })}
                    className={`text-[10px] font-mono px-2 py-1 rounded ${item.active ? 'bg-success/20 text-success' : 'bg-bg-surface text-text-muted'}`}
                  >
                    {item.active ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
              {(!overagePricing || overagePricing.length === 0) && (
                <div className="text-xs text-text-muted text-center py-4">Run migration 028 to enable overage pricing.</div>
              )}
            </div>
          </Panel>

          <Panel title="Integration Status">
            <div className="space-y-2">
              {[
                { name: 'Claude AI', status: 'active', desc: 'Contract analysis, prospecting, valuations' },
                { name: 'Apollo.io', status: 'pending', desc: 'Add APOLLO_API_KEY to activate' },
                { name: 'Hunter.io', status: 'pending', desc: 'Add HUNTER_API_KEY to activate' },
                { name: 'Email (Resend)', status: 'pending', desc: 'Add RESEND_API_KEY to activate' },
                { name: 'Stripe', status: 'pending', desc: 'Coming soon — billing integration' },
              ].map(int => (
                <div key={int.name} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-text-primary">{int.name}</span>
                    <span className="text-xs text-text-muted ml-2">{int.desc}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    int.status === 'active' ? 'bg-success/20 text-success' : 'bg-bg-card text-text-muted'
                  }`}>
                    {int.status}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* CODE HEALTH */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Automated code analysis runs twice daily. Reports include working modules, issues, and AI-suggested improvements.</p>
            <button
              onClick={runCodeAnalysis}
              disabled={runningAnalysis}
              className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
            >
              {runningAnalysis ? 'Analyzing...' : 'Run Analysis Now'}
            </button>
          </div>
          {analysisReports?.map(report => (
            <div key={report.id} className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{report.run_date}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{report.run_time}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${report.status === 'completed' ? 'bg-success/10 text-success' : report.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{report.status}</span>
                </div>
                {report.build_status && <span className="text-[10px] font-mono text-text-muted">Build: {report.build_status}</span>}
              </div>
              {report.summary && <p className="text-xs text-text-secondary mb-3">{report.summary}</p>}
              {/* Issues */}
              {report.issues?.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">Issues ({report.issues.length})</div>
                  {report.issues.map((issue, i) => (
                    <div key={i} className={`flex items-start gap-2 py-1.5 text-xs border-l-2 pl-2 mb-1 ${
                      issue.severity === 'critical' || issue.severity === 'high' ? 'border-l-danger' : issue.severity === 'medium' ? 'border-l-warning' : 'border-l-text-muted'
                    }`}>
                      <div className="flex-1">
                        <span className="text-text-primary">[{issue.module}] {issue.description}</span>
                        {issue.fix_suggestion && <div className="text-text-muted mt-0.5">Fix: {issue.fix_suggestion}</div>}
                      </div>
                      {issue.can_auto_fix && (
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-accent/10 text-accent shrink-0">auto-fixable</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Improvements */}
              {report.improvements?.length > 0 && (
                <div>
                  <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">Improvements ({report.improvements.length})</div>
                  {report.improvements.map((imp, i) => (
                    <div key={i} className="flex items-start justify-between py-1 text-xs">
                      <span className="text-text-secondary">[{imp.module}] {imp.description}</span>
                      <div className="flex gap-1 shrink-0">
                        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${imp.impact === 'high' ? 'bg-success/10 text-success' : 'bg-bg-card text-text-muted'}`}>{imp.impact}</span>
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-bg-card text-text-muted">{imp.effort}</span>
                        {imp.from_user_suggestion && <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-accent/10 text-accent">user req</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!analysisReports || analysisReports.length === 0) && (
            <div className="text-center text-text-muted text-sm py-12 bg-bg-surface border border-border rounded-lg">
              No analysis reports yet. Click "Run Analysis Now" to generate your first report.
            </div>
          )}
        </div>
      )}

      {/* FEATURE SUGGESTIONS */}
      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap text-xs">
            <span className="text-text-muted font-mono">
              {suggestions?.length || 0} total &middot;
              {(suggestions || []).filter(s => s.status === 'new').length || 0} new &middot;
              {(suggestions || []).filter(s => s.status === 'planned').length || 0} planned &middot;
              {(suggestions || []).filter(s => s.contact_me).length || 0} want contact
            </span>
          </div>
          {suggestions?.map(s => {
            const statusColors = {
              new: 'bg-accent/10 text-accent', reviewed: 'bg-bg-card text-text-muted',
              planned: 'bg-success/10 text-success', in_progress: 'bg-warning/10 text-warning',
              completed: 'bg-success/10 text-success', declined: 'bg-danger/10 text-danger',
            }
            const priorityColors = { critical: 'text-danger', important: 'text-warning', nice_to_have: 'text-text-muted' }
            return (
              <div key={s.id} className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-text-primary">{s.title}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{s.category}</span>
                      <span className={`text-[9px] font-mono ${priorityColors[s.priority]}`}>{s.priority?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-2">{s.description}</p>
                    <div className="flex gap-3 text-[10px] text-text-muted">
                      <span>{s.user_name}</span>
                      <span>{s.user_email}</span>
                      {s.contact_me && <span className="text-accent">Wants contact</span>}
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <select
                    value={s.status}
                    onChange={(e) => updateSuggestionMutation.mutate({ id: s.id, updates: { status: e.target.value } })}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent shrink-0"
                  >
                    {['new', 'reviewed', 'planned', 'in_progress', 'completed', 'declined'].map(st => (
                      <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
          {(!suggestions || suggestions.length === 0) && (
            <div className="text-center text-text-muted text-sm py-12 bg-bg-surface border border-border rounded-lg">
              No feature suggestions yet. Users can submit from the sidebar.
            </div>
          )}
        </div>
      )}

      {/* CONTACT CACHE */}
      {activeTab === 'cache' && (
        <div className="space-y-4">
          <Panel title="Contact Research Cache">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted">
                Cached contact lookups shared across all users. 30-day TTL. {lookupCounts?.total || 0} API calls this month ({lookupCounts?.credits || 0} credits).
              </p>
              <span className="text-sm font-mono text-accent">{(contactCache || []).length} companies cached</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase">Company</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase">Source</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase text-center">Contacts</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase text-center">Pulls</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase">Last Fetched</th>
                    <th className="px-3 py-2 text-[10px] text-text-muted font-mono uppercase">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {(contactCache || []).map((c, i) => {
                    const isExpired = new Date(c.expiresAt) < new Date()
                    return (
                      <tr key={i} className={`border-b border-border last:border-0 ${isExpired ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-2 text-text-primary font-medium">{c.name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            c.source === 'apollo' ? 'bg-success/10 text-success' :
                            c.source === 'hunter' ? 'bg-accent/10 text-accent' :
                            'bg-bg-card text-text-muted'
                          }`}>{c.source}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-text-secondary">{c.contactCount}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`font-mono text-sm ${c.pullCount > 3 ? 'text-accent font-bold' : 'text-text-secondary'}`}>{c.pullCount}</span>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-text-muted font-mono">{new Date(c.lastFetched).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-[10px] font-mono">
                          {isExpired
                            ? <span className="text-danger">Expired</span>
                            : <span className="text-text-muted">{Math.ceil((new Date(c.expiresAt) - new Date()) / 86400000)}d left</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                  {(!contactCache || contactCache.length === 0) && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-text-muted text-xs">No cached contact research yet. Lookups will appear here after users search for contacts.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* CUSTOM DASHBOARDS */}
      {activeTab === 'custom' && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">Custom dashboard requests from property admins. Use Claude Code to build each one and deliver to the requesting property.</p>
          {customRequests?.map(r => {
            const statusColors = {
              submitted: 'bg-accent/10 text-accent', contacted: 'bg-accent/10 text-accent',
              scoping: 'bg-warning/10 text-warning', building: 'bg-success/10 text-success',
              delivered: 'bg-success/10 text-success', declined: 'bg-danger/10 text-danger',
            }
            return (
              <div key={r.id} className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-text-primary">{r.property_name || r.properties?.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${statusColors[r.status]}`}>{r.status}</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-2">{r.description}</p>
                    <div className="flex gap-3 text-[10px] text-text-muted flex-wrap">
                      <span>{r.contact_name}</span>
                      <span>{r.contact_email}</span>
                      {r.contact_phone && <span>{r.contact_phone}</span>}
                      {r.budget_range && <span className="text-accent">{r.budget_range}</span>}
                      {r.timeline && <span>{r.timeline}</span>}
                    </div>
                    {r.desired_features?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {r.desired_features.map((f, i) => (
                          <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{f.feature}</span>
                        ))}
                      </div>
                    )}
                    {r.integrations_needed && (
                      <div className="text-[10px] text-text-muted mt-1">Integrations: {r.integrations_needed}</div>
                    )}
                    {r.branding?.logo_url && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-text-muted">Logo:</span>
                        <img src={r.branding.logo_url} alt="Logo" className="h-6 object-contain" />
                        {r.branding.primary_color && <span className="w-4 h-4 rounded" style={{ background: r.branding.primary_color }} />}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <select
                      value={r.status}
                      onChange={(e) => updateCustomRequestMutation.mutate({ id: r.id, updates: { status: e.target.value } })}
                      className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                    >
                      {['submitted', 'contacted', 'scoping', 'building', 'delivered', 'declined'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
          {(!customRequests || customRequests.length === 0) && (
            <div className="text-center text-text-muted text-sm py-12 bg-bg-surface border border-border rounded-lg">
              No custom dashboard requests yet. Admins can request from their sidebar.
            </div>
          )}
        </div>
      )}

      {/* CRM Data Importer Modal */}
      {showCRMImporter && (
        <Suspense fallback={null}>
          <CRMDataImporter
            onClose={() => setShowCRMImporter(false)}
            onImported={(count) => {
              queryClient.invalidateQueries()
              toast({ title: `${count} records imported`, type: 'success' })
              setShowCRMImporter(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <h3 className="text-sm font-mono text-text-muted uppercase mb-3">{title}</h3>
      {children}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-text-muted font-mono uppercase">{label}</div>
      <div className={`text-xl font-semibold font-mono ${color} mt-0.5`}>{value}</div>
    </div>
  )
}

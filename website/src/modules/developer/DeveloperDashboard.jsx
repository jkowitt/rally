import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useToast } from '@/components/Toast'
import { Navigate } from 'react-router-dom'

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

  if (!isDeveloper) return <Navigate to="/app" replace />

  const { data: properties } = useQuery({
    queryKey: ['dev-properties'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('*').order('name')
      return data || []
    },
  })

  const { data: profiles } = useQuery({
    queryKey: ['dev-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*, properties(name)').order('created_at', { ascending: false })
      return data || []
    },
  })

  const { data: invitations } = useQuery({
    queryKey: ['dev-invitations'],
    queryFn: async () => {
      const { data } = await supabase.from('invitations').select('*, properties(name)').order('created_at', { ascending: false }).limit(50)
      return data || []
    },
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-properties'] })
      toast({ title: 'Property updated', type: 'success' })
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
    { id: 'properties', label: `Properties (${properties?.length || 0})` },
    { id: 'users', label: `Users (${profiles?.length || 0})` },
    { id: 'flags', label: 'Feature Flags' },
    { id: 'api', label: 'API Usage' },
    { id: 'health', label: `Code Health (${analysisReports?.length || 0})` },
    { id: 'suggestions', label: `Suggestions (${suggestions?.filter(s => s.status === 'new').length || 0})` },
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Properties" value={properties?.length || 0} color="text-accent" />
        <StatCard label="Total Users" value={profiles?.length || 0} color="text-text-primary" />
        <StatCard label="Admins" value={profiles?.filter(p => p.role === 'admin').length || 0} color="text-warning" />
        <StatCard label="Pending Invites" value={invitations?.filter(i => !i.accepted).length || 0} color="text-text-muted" />
      </div>

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
          {/* Recent Users */}
          <Panel title="Recent Users">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {profiles?.slice(0, 10).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <span className="text-sm text-text-primary">{p.full_name || p.email || p.id.slice(0, 8)}</span>
                    <span className="text-xs text-text-muted ml-2">{p.properties?.name || 'No property'}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${roleColor[p.role]}`}>{p.role}</span>
                </div>
              ))}
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
              {invitations?.filter(i => !i.accepted).slice(0, 10).map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-text-primary">{inv.email}</span>
                  <span className="text-text-muted">{inv.properties?.name} &middot; {inv.role}</span>
                </div>
              ))}
              {invitations?.filter(i => !i.accepted).length === 0 && (
                <div className="text-text-muted text-xs">No pending invitations</div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* PROPERTIES */}
      {activeTab === 'properties' && (
        <div className="space-y-3">
          {properties?.map(p => (
            <div key={p.id} className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-text-muted font-mono flex-wrap">
                    {p.sport && <span>{p.sport}</span>}
                    {p.conference && <span>{p.conference}</span>}
                    {p.city && <span>{p.city}, {p.state}</span>}
                    <span>{profiles?.filter(pr => pr.property_id === p.id).length || 0} users</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <select
                    value={p.plan || 'free'}
                    onChange={(e) => updatePropertyMutation.mutate({ id: p.id, updates: { plan: e.target.value } })}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    {PLANS.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* USERS */}
      {activeTab === 'users' && (
        <div className="space-y-2">
          {profiles?.map(p => (
            <div key={p.id} className="bg-bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-text-primary">{p.full_name || p.id.slice(0, 8)}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${roleColor[p.role]}`}>{p.role}</span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {p.email || p.id.slice(0, 12)} &middot; {p.properties?.name || 'No property'}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <select
                  value={p.role}
                  onChange={(e) => updateRoleMutation.mutate({ userId: p.id, role: e.target.value })}
                  className="bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  value={p.property_id || ''}
                  onChange={(e) => assignPropertyMutation.mutate({ userId: p.id, propertyId: e.target.value || null })}
                  className="bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent max-w-[120px]"
                >
                  <option value="">No property</option>
                  {properties?.map(prop => <option key={prop.id} value={prop.id}>{prop.name}</option>)}
                </select>
                {p.id !== profile?.id && (
                  <button
                    onClick={() => { if (confirm(`Remove ${p.full_name || p.id.slice(0, 8)}?`)) deleteUserMutation.mutate(p.id) }}
                    className="text-text-muted hover:text-danger text-xs px-1"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FLAGS */}
      {activeTab === 'flags' && (
        <Panel title="Module Feature Flags">
          <p className="text-xs text-text-muted mb-4">Toggle modules on/off globally. These control sidebar visibility for all users.</p>
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
              {suggestions?.filter(s => s.status === 'new').length || 0} new &middot;
              {suggestions?.filter(s => s.status === 'planned').length || 0} planned &middot;
              {suggestions?.filter(s => s.contact_me).length || 0} want contact
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

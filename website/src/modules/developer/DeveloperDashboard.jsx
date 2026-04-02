import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { Navigate } from 'react-router-dom'

export default function DeveloperDashboard() {
  const { isDeveloper } = useAuth()
  const { flags, toggleFlag } = useFeatureFlags()

  if (!isDeveloper) return <Navigate to="/app" replace />

  const { data: properties } = useQuery({
    queryKey: ['dev-properties'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('*, profiles(count)')
      return data || []
    },
  })

  const { data: profiles } = useQuery({
    queryKey: ['dev-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*, properties(name)')
      return data || []
    },
  })

  const { data: uiContent } = useQuery({
    queryKey: ['dev-ui-content'],
    queryFn: async () => {
      const { data } = await supabase.from('ui_content').select('*').order('key')
      return data || []
    },
  })

  const { data: legalDocs } = useQuery({
    queryKey: ['dev-legal-docs'],
    queryFn: async () => {
      const { data } = await supabase.from('legal_documents').select('*').order('created_at', { ascending: false })
      return data || []
    },
  })

  const { data: exports } = useQuery({
    queryKey: ['dev-exports'],
    queryFn: async () => {
      const { data } = await supabase.from('data_exports').select('*').order('created_at', { ascending: false }).limit(20)
      return data || []
    },
  })

  const { data: userEvents } = useQuery({
    queryKey: ['dev-events'],
    queryFn: async () => {
      const { data } = await supabase.from('user_events').select('*').order('created_at', { ascending: false }).limit(50)
      return data || []
    },
  })

  const { data: claudeContext } = useQuery({
    queryKey: ['dev-claude-context'],
    queryFn: async () => {
      const { data } = await supabase.from('claude_context').select('*').eq('active', true)
      return data || []
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Developer Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">System administration and monitoring</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Properties */}
        <Panel title={`Properties (${properties?.length || 0})`}>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {properties?.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1">
                <span className="text-sm text-text-primary">{p.name}</span>
                <span className="text-xs text-text-muted font-mono">{p.sport} &middot; {p.conference}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Users */}
        <Panel title={`Users (${profiles?.length || 0})`}>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {profiles?.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1">
                <span className="text-sm text-text-primary">{p.full_name || p.id.slice(0, 8)}</span>
                <div className="flex gap-2">
                  <span className="text-xs text-text-muted">{p.properties?.name}</span>
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${p.role === 'developer' ? 'bg-accent/20 text-accent' : 'bg-bg-card text-text-muted'}`}>
                    {p.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* UI Content */}
        <Panel title={`UI Content (${uiContent?.length || 0})`}>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uiContent?.map((c) => (
              <div key={c.id} className="py-1">
                <div className="text-xs text-text-muted font-mono">{c.key}</div>
                <div className="text-sm text-text-primary truncate">{c.value || '—'}</div>
              </div>
            ))}
            {uiContent?.length === 0 && <div className="text-text-muted text-xs">No content entries.</div>}
          </div>
        </Panel>

        {/* Legal Documents */}
        <Panel title={`Legal Documents (${legalDocs?.length || 0})`}>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {legalDocs?.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-1">
                <span className="text-sm text-text-primary">{d.type}</span>
                <span className="text-xs text-text-muted font-mono">v{d.version} &middot; {d.effective_date}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Claude Context */}
        <Panel title={`Claude Context (${claudeContext?.length || 0})`}>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {claudeContext?.map((c) => (
              <div key={c.id} className="py-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted font-mono">{c.context_type}</span>
                  <span className="text-xs text-text-muted">{c.source}</span>
                </div>
                <div className="text-sm text-text-secondary truncate">{JSON.stringify(c.content).slice(0, 80)}</div>
              </div>
            ))}
            {claudeContext?.length === 0 && <div className="text-text-muted text-xs">No active context.</div>}
          </div>
        </Panel>

        {/* User Events / Analytics */}
        <Panel title={`User Events (${userEvents?.length || 0})`}>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {userEvents?.slice(0, 20).map((e) => (
              <div key={e.id} className="flex items-center justify-between py-0.5 text-xs">
                <span className="text-text-secondary">{e.event_type}</span>
                <span className="text-text-muted font-mono">{e.module} &middot; {new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
            {userEvents?.length === 0 && <div className="text-text-muted text-xs">No events recorded.</div>}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5">
      <h3 className="text-sm font-mono text-text-muted uppercase mb-3">{title}</h3>
      {children}
    </div>
  )
}

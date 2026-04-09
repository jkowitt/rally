import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

export default function ReportBuilder() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [viewingReport, setViewingReport] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [form, setForm] = useState({ title: '', description: '', report_type: 'custom', prompt: '' })

  const { data: reports } = useQuery({
    queryKey: ['biz-reports'],
    queryFn: async () => { const { data } = await supabase.from('biz_reports').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }); return data || [] },
  })

  // Gather platform data for Claude context
  async function gatherPlatformContext() {
    const [profiles, properties, deals, contracts, pipeline, finances] = await Promise.all([
      supabase.from('profiles').select('id, role, created_at', { count: 'exact', head: false }),
      supabase.from('properties').select('id, name, plan, type, created_at'),
      supabase.from('deals').select('id, brand_name, value, stage, created_at'),
      supabase.from('contracts').select('id, total_value, status, signed'),
      supabase.from('biz_pipeline').select('*'),
      supabase.from('biz_finances').select('*'),
    ])

    const totalUsers = profiles.data?.length || 0
    const paidProperties = (properties.data || []).filter(p => p.plan !== 'free')
    const mrr = paidProperties.reduce((s, p) => s + (p.plan === 'starter' ? 39 : p.plan === 'pro' ? 99 : p.plan === 'enterprise' ? 249 : 0), 0)
    const totalDeals = deals.data?.length || 0
    const wonDeals = (deals.data || []).filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage))
    const totalRevenue = (finances.data || []).filter(f => f.category === 'revenue').reduce((s, f) => s + (Number(f.amount) || 0), 0)
    const totalExpenses = (finances.data || []).filter(f => f.category === 'expense').reduce((s, f) => s + (Number(f.amount) || 0), 0)

    return `Platform Data:
- Total users: ${totalUsers}
- Paid properties: ${paidProperties.length}
- MRR: $${mrr}
- ARR: $${mrr * 12}
- Total customer deals: ${totalDeals} (${wonDeals.length} won)
- Pipeline deals: ${(pipeline.data || []).length}
- Recorded revenue: $${totalRevenue}
- Recorded expenses: $${totalExpenses}
- Net: $${totalRevenue - totalExpenses}
- Properties by plan: ${JSON.stringify((properties.data || []).reduce((acc, p) => { acc[p.plan || 'free'] = (acc[p.plan || 'free'] || 0) + 1; return acc }, {}))}
- Properties by type: ${JSON.stringify((properties.data || []).reduce((acc, p) => { acc[p.type || 'other'] = (acc[p.type || 'other'] || 0) + 1; return acc }, {}))}`
  }

  async function generateReport() {
    setGenerating(true)
    try {
      const context = await gatherPlatformContext()

      const { data, error } = await supabase.functions.invoke('contract-ai', {
        body: {
          action: 'edit_contract',
          contract_text: `REPORT: ${form.title}\n\n[Report content will be generated here]`,
          instructions: `Generate a detailed business report based on this request: "${form.prompt || form.description || form.title}"

${context}

Write a comprehensive report in markdown format with:
- Executive Summary
- Key metrics and analysis
- Insights and recommendations
- Action items

Use real numbers from the platform data above. Be specific and actionable.`,
        },
      })

      if (error) throw error

      const content = data?.contract_text || 'Report generation failed'

      const { error: saveErr } = await supabase.from('biz_reports').insert({
        title: form.title,
        description: form.description,
        report_type: form.report_type,
        content,
        created_by: profile?.id,
      })
      if (saveErr) throw saveErr

      queryClient.invalidateQueries({ queryKey: ['biz-reports'] })
      toast({ title: 'Report generated', type: 'success' })
      setShowCreate(false)
      setForm({ title: '', description: '', report_type: 'custom', prompt: '' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' })
    }
    setGenerating(false)
  }

  const saveMutation = useMutation({
    mutationFn: async ({ title, content }) => {
      const { error } = await supabase.from('biz_reports').insert({ title, content, report_type: 'custom', created_by: profile?.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-reports'] }); toast({ title: 'Report saved', type: 'success' }) },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => { await supabase.from('biz_reports').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biz-reports'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await supabase.from('biz_reports').delete().eq('id', id) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-reports'] }); toast({ title: 'Deleted', type: 'success' }); setViewingReport(null) },
  })

  // Quick report templates
  const TEMPLATES = [
    { title: 'Monthly Business Review', prompt: 'Generate a monthly business review covering MRR growth, user acquisition, churn, top deals, and recommendations for next month.' },
    { title: 'Investor Update', prompt: 'Generate a concise investor update email covering key metrics, recent wins, challenges, and next milestones.' },
    { title: 'Growth Analysis', prompt: 'Analyze our growth trajectory, identify bottlenecks, and recommend 3 specific actions to accelerate user acquisition.' },
    { title: 'Revenue Forecast', prompt: 'Based on current trends, forecast revenue for the next 6 months with best-case, likely, and worst-case scenarios.' },
    { title: 'Competitive Position', prompt: 'Analyze our positioning vs Monday CRM, SponsorCX, and HubSpot. What are our advantages and where do we need to improve?' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-sm font-mono text-text-muted uppercase">Reports</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">+ AI Report</button>
          <button onClick={() => {
            const title = prompt('Report title:')
            if (title) saveMutation.mutate({ title, content: '# ' + title + '\n\nStart writing...' })
          }} className="bg-bg-surface border border-border text-text-secondary px-3 py-2 rounded text-sm hover:text-text-primary">+ Manual</button>
        </div>
      </div>

      {/* AI Report Generator */}
      {showCreate && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Generate AI Report</h3>
          <div className="flex gap-2 flex-wrap mb-2">
            {TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => setForm({ ...form, title: t.title, prompt: t.prompt })} className="text-[10px] bg-bg-card border border-border text-text-secondary px-2 py-1 rounded hover:border-accent/50 w-full sm:w-auto">{t.title}</button>
            ))}
          </div>
          <input placeholder="Report Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          <textarea placeholder="What should this report cover? Claude will use live platform data." value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} rows={3} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          <div className="flex gap-2 flex-wrap">
            <button onClick={generateReport} disabled={generating || !form.title} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">{generating ? 'Generating...' : 'Generate with Claude'}</button>
            <button onClick={() => setShowCreate(false)} className="text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Report Viewer */}
      {viewingReport && (
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{viewingReport.title}</h3>
              <span className="text-[10px] text-text-muted font-mono">{new Date(viewingReport.created_at).toLocaleString()}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => updateMutation.mutate({ id: viewingReport.id, updates: { pinned: !viewingReport.pinned } })} className={`text-[10px] font-mono px-2 py-1 rounded ${viewingReport.pinned ? 'bg-accent/10 text-accent' : 'bg-bg-card text-text-muted'}`}>{viewingReport.pinned ? 'Unpin' : 'Pin'}</button>
              <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(viewingReport.id) }} className="text-[10px] text-danger hover:underline">Delete</button>
              <button onClick={() => setViewingReport(null)} className="text-text-muted hover:text-text-primary">Close</button>
            </div>
          </div>
          <textarea
            value={editingContent}
            onChange={e => setEditingContent(e.target.value)}
            onBlur={() => { if (editingContent !== viewingReport.content) updateMutation.mutate({ id: viewingReport.id, updates: { content: editingContent } }) }}
            className="w-full bg-bg-card border border-border rounded p-4 text-sm text-text-primary font-mono leading-relaxed focus:outline-none focus:border-accent min-h-[200px] sm:min-h-[400px]"
          />
        </div>
      )}

      {/* Report List */}
      {!viewingReport && (
        <div className="space-y-2">
          {(reports || []).map(r => (
            <div key={r.id} className={`bg-bg-surface border rounded-lg p-3 cursor-pointer hover:border-accent/30 transition-colors ${r.pinned ? 'border-accent/30' : 'border-border'}`} onClick={() => { setViewingReport(r); setEditingContent(r.content || '') }}>
              <div className="flex items-center gap-2">
                {r.pinned && <span className="text-[9px] text-accent font-mono">Pinned</span>}
                <span className="text-sm text-text-primary font-medium">{r.title}</span>
                <span className="text-[10px] font-mono bg-bg-card px-1.5 py-0.5 rounded text-text-muted">{r.report_type}</span>
                <span className="text-[10px] text-text-muted font-mono ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.content && <div className="text-xs text-text-secondary mt-1 truncate">{r.content.slice(0, 120)}...</div>}
            </div>
          ))}
          {(!reports || reports.length === 0) && <div className="text-text-muted text-center py-8 text-xs">No reports yet. Generate one with AI or create manually.</div>}
        </div>
      )}
    </div>
  )
}

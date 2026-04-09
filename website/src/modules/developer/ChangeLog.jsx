import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const CATEGORIES = [
  { id: 'all', label: 'All', color: 'text-text-secondary' },
  { id: 'feature', label: 'Feature', color: 'text-accent' },
  { id: 'bugfix', label: 'Bug Fix', color: 'text-danger' },
  { id: 'improvement', label: 'Improvement', color: 'text-success' },
  { id: 'refactor', label: 'Refactor', color: 'text-[#7c3aed]' },
  { id: 'security', label: 'Security', color: 'text-warning' },
  { id: 'performance', label: 'Performance', color: 'text-[#06b6d4]' },
  { id: 'mobile', label: 'Mobile', color: 'text-[#ec4899]' },
  { id: 'qa', label: 'QA', color: 'text-[#8b5cf6]' },
  { id: 'infrastructure', label: 'Infra', color: 'text-text-muted' },
]

const CATEGORY_BADGES = {
  feature: 'bg-accent/15 text-accent',
  bugfix: 'bg-danger/15 text-danger',
  improvement: 'bg-success/15 text-success',
  refactor: 'bg-[#7c3aed]/15 text-[#7c3aed]',
  security: 'bg-warning/15 text-warning',
  performance: 'bg-[#06b6d4]/15 text-[#06b6d4]',
  mobile: 'bg-[#ec4899]/15 text-[#ec4899]',
  qa: 'bg-[#8b5cf6]/15 text-[#8b5cf6]',
  infrastructure: 'bg-bg-card text-text-muted',
}

const SOURCE_LABELS = {
  claude_code: 'Claude Code',
  manual: 'Manual',
  auto_qa: 'Auto QA',
  auto_fix: 'Auto Fix',
}

export default function ChangeLog() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newEntry, setNewEntry] = useState({ title: '', description: '', category: 'improvement', module: '', files_changed: '', source: 'claude_code' })
  const [expandedId, setExpandedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: entries } = useQuery({
    queryKey: ['change-log', filter],
    queryFn: async () => {
      let q = supabase.from('change_log').select('*').order('created_at', { ascending: false }).limit(200)
      if (filter !== 'all') q = q.eq('category', filter)
      const { data } = await q
      return data || []
    },
  })

  const filteredEntries = searchQuery
    ? (entries || []).filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.description?.toLowerCase().includes(searchQuery.toLowerCase()) || e.module?.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries

  // Group by date
  const groupedByDate = {}
  ;(filteredEntries || []).forEach(e => {
    const date = new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    if (!groupedByDate[date]) groupedByDate[date] = []
    groupedByDate[date].push(e)
  })

  // Stats
  const totalEntries = (entries || []).length
  const thisWeek = (entries || []).filter(e => new Date(e.created_at) > new Date(Date.now() - 7 * 86400000)).length
  const thisMonth = (entries || []).filter(e => new Date(e.created_at) > new Date(Date.now() - 30 * 86400000)).length
  const categoryCounts = {}
  ;(entries || []).forEach(e => { categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1 })

  async function addEntry() {
    if (!newEntry.title.trim()) return
    const { error } = await supabase.from('change_log').insert({
      ...newEntry,
      created_by: profile?.id,
    })
    if (error) { toast({ title: 'Error', description: error.message, type: 'error' }); return }
    queryClient.invalidateQueries({ queryKey: ['change-log'] })
    setNewEntry({ title: '', description: '', category: 'improvement', module: '', files_changed: '', source: 'claude_code' })
    setShowAdd(false)
    toast({ title: 'Change logged', type: 'success' })
  }

  async function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return
    await supabase.from('change_log').delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['change-log'] })
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg-card rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-text-primary">{totalEntries}</div>
          <div className="text-[9px] text-text-muted">Total Changes</div>
        </div>
        <div className="bg-bg-card rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-accent">{thisWeek}</div>
          <div className="text-[9px] text-text-muted">This Week</div>
        </div>
        <div className="bg-bg-card rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-text-secondary">{thisMonth}</div>
          <div className="text-[9px] text-text-muted">This Month</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search changes..." className="flex-1 min-w-[150px] bg-bg-card border border-border rounded px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent" />
        <button onClick={() => setShowAdd(!showAdd)} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium shrink-0">{showAdd ? 'Cancel' : 'Log Change'}</button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={`text-[10px] px-2 py-1 rounded whitespace-nowrap shrink-0 ${filter === c.id ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}>
            {c.label} {c.id !== 'all' && categoryCounts[c.id] ? `(${categoryCounts[c.id]})` : ''}
          </button>
        ))}
      </div>

      {/* Add entry form */}
      {showAdd && (
        <div className="bg-bg-card border border-accent/30 rounded-lg p-4 space-y-3">
          <input value={newEntry.title} onChange={e => setNewEntry(p => ({ ...p, title: e.target.value }))} placeholder="What changed?" className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
          <textarea value={newEntry.description} onChange={e => setNewEntry(p => ({ ...p, description: e.target.value }))} placeholder="Details (optional)" rows={3} className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select value={newEntry.category} onChange={e => setNewEntry(p => ({ ...p, category: e.target.value }))} className="bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary">
              {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input value={newEntry.module} onChange={e => setNewEntry(p => ({ ...p, module: e.target.value }))} placeholder="Module (e.g. pipeline)" className="bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary" />
            <input value={newEntry.files_changed} onChange={e => setNewEntry(p => ({ ...p, files_changed: e.target.value }))} placeholder="Files changed" className="bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary" />
            <select value={newEntry.source} onChange={e => setNewEntry(p => ({ ...p, source: e.target.value }))} className="bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary">
              <option value="claude_code">Claude Code</option>
              <option value="manual">Manual</option>
              <option value="auto_qa">Auto QA</option>
              <option value="auto_fix">Auto Fix</option>
            </select>
          </div>
          <button onClick={addEntry} disabled={!newEntry.title.trim()} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium disabled:opacity-50">Save</button>
        </div>
      )}

      {/* Entries grouped by date */}
      {Object.entries(groupedByDate).map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-text-muted font-mono shrink-0">{date}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-1.5">
            {items.map(entry => {
              const isExpanded = expandedId === entry.id
              return (
                <div key={entry.id} className="bg-bg-surface border border-border rounded-lg overflow-hidden hover:border-border">
                  <div className="px-3 py-2 flex items-center gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded shrink-0 ${CATEGORY_BADGES[entry.category] || 'bg-bg-card text-text-muted'}`}>
                      {entry.category}
                    </span>
                    <span className="text-xs text-text-primary flex-1 min-w-0 truncate">{entry.title}</span>
                    {entry.module && <span className="text-[9px] text-text-muted bg-bg-card px-1 py-0.5 rounded hidden sm:inline">{entry.module}</span>}
                    <span className="text-[9px] text-text-muted shrink-0">{SOURCE_LABELS[entry.source]}</span>
                    <span className="text-[9px] text-text-muted shrink-0 hidden sm:inline">{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border pt-2 space-y-2">
                      {entry.description && <pre className="text-[11px] text-text-secondary whitespace-pre-wrap">{entry.description}</pre>}
                      <div className="flex items-center gap-3 flex-wrap text-[9px] text-text-muted">
                        {entry.module && <span>Module: <span className="text-text-secondary">{entry.module}</span></span>}
                        {entry.files_changed && <span>Files: <span className="text-text-secondary font-mono">{entry.files_changed}</span></span>}
                        {entry.commit_sha && <span>Commit: <span className="text-accent font-mono">{entry.commit_sha.slice(0, 7)}</span></span>}
                        <span>Source: <span className="text-text-secondary">{SOURCE_LABELS[entry.source]}</span></span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(`${entry.title}\n${entry.description || ''}`); toast({ title: 'Copied', type: 'success' }) }} className="text-[9px] text-accent hover:underline">Copy</button>
                        <button onClick={() => deleteEntry(entry.id)} className="text-[9px] text-danger hover:underline">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {(!filteredEntries || filteredEntries.length === 0) && (
        <div className="text-center py-8 text-text-muted text-sm">
          {searchQuery ? 'No changes match your search.' : 'No changes logged yet. Changes will appear here as features are built.'}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import * as pricingService from '@/services/pricingService'

export default function HistoryTab() {
  const [history, setHistory] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => { reload() }, [filter])

  async function reload() {
    setHistory(await pricingService.listHistory({ type: filter }))
  }

  function exportCsv() {
    const header = 'timestamp,change_type,entity_key,field,previous,new\n'
    const rows = history.map(h =>
      [h.created_at, h.change_type, h.entity_key || '', h.field_name || '', h.previous_value || '', h.new_value || '']
        .map(v => `"${(v + '').replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pricing-history-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {['all', 'plan', 'limit', 'feature', 'credit_cost', 'credit_pack', 'addon', 'page'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[10px] px-2 py-1 rounded ${filter === t ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="text-[10px] border border-border px-2 py-1 rounded hover:border-accent/50">
          Export CSV
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left p-2">When</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Entity</th>
              <th className="text-left p-2">Field</th>
              <th className="text-left p-2">Before → After</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-text-muted">No history yet</td></tr>}
            {history.map(h => (
              <tr key={h.id} className="border-t border-border">
                <td className="p-2 text-[10px] text-text-muted">{new Date(h.created_at).toLocaleString()}</td>
                <td className="p-2 font-mono text-[10px]">{h.change_type}</td>
                <td className="p-2 text-text-secondary">{h.entity_key || '—'}</td>
                <td className="p-2 font-mono text-[10px] text-text-muted">{h.field_name}</td>
                <td className="p-2 text-[11px]">
                  <span className="text-danger">{h.previous_value || '∅'}</span>
                  {' → '}
                  <span className="text-success">{h.new_value || '∅'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

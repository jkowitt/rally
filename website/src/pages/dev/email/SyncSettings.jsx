import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as sync from '@/services/email/pipelineSyncService'
import * as listService from '@/services/email/emailListService'

export default function SyncSettings() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState(null)
  const [lists, setLists] = useState([])
  const [saving, setSaving] = useState(false)
  const [log, setLog] = useState([])

  useEffect(() => { init() }, [])

  async function init() {
    if (!profile?.property_id) return
    const [s, l, lg] = await Promise.all([
      sync.getSyncSettings(profile.property_id),
      listService.listLists(),
      sync.getRecentSyncLog(25),
    ])
    setSettings(s)
    setLists(l.lists)
    setLog(lg)
  }

  async function save(patch) {
    setSaving(true)
    await sync.updateSyncSettings(profile.property_id, patch)
    setSettings({ ...settings, ...patch })
    setSaving(false)
  }

  if (!settings) return <div className="p-6 text-xs text-text-muted">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <Link to="/app/marketing/email/sync" className="text-[10px] text-text-muted hover:text-accent">← Pipeline Sync</Link>
        <h2 className="text-xl font-semibold mt-1">Auto-Sync Settings</h2>
      </header>

      <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
        <label className="flex items-center justify-between">
          <div>
            <div className="text-sm">Automatically sync new pipeline contacts</div>
            <div className="text-[10px] text-text-muted">Runs within 5 minutes of contact creation</div>
          </div>
          <Toggle value={settings.auto_sync_enabled} onChange={v => save({ auto_sync_enabled: v })} />
        </label>

        <div className="pt-3 border-t border-border">
          <label className="text-[11px] text-text-muted block mb-1">Target lists (new contacts auto-added to these)</label>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {lists.map(l => (
              <label key={l.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={settings.auto_sync_target_list_ids?.includes(l.id)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...(settings.auto_sync_target_list_ids || []), l.id]
                      : (settings.auto_sync_target_list_ids || []).filter(x => x !== l.id)
                    save({ auto_sync_target_list_ids: next })
                  }}
                />
                {l.name}
              </label>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm">Sync all contacts</div>
              <div className="text-[10px] text-text-muted">Off = filter by deal stage</div>
            </div>
            <Toggle value={settings.sync_all_contacts} onChange={v => save({ sync_all_contacts: v })} />
          </label>
        </div>

        <div className="pt-3 border-t border-border">
          <label className="text-[11px] text-text-muted block mb-1">
            Show "New" badge for <strong className="text-accent">{settings.recent_add_display_hours}</strong> hours
          </label>
          <input
            type="range"
            min={24}
            max={168}
            step={24}
            value={settings.recent_add_display_hours}
            onChange={e => save({ recent_add_display_hours: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-[9px] text-text-muted">
            <span>24h</span><span>48h</span><span>72h</span><span>7d</span>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-4 text-xs">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Sync status</div>
        <div>Last bulk sync: <span className="text-text-primary">{settings.last_bulk_sync_at ? new Date(settings.last_bulk_sync_at).toLocaleString() : 'Never'}</span></div>
        <div>Total synced: <span className="text-accent font-semibold">{settings.total_synced}</span></div>
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Recent sync log</div>
        <div className="bg-bg-card border border-border rounded-lg overflow-y-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left p-2">When</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Contact</th>
                <th className="text-left p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-text-muted">No sync activity yet</td></tr>}
              {log.map(l => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-2 text-[10px] text-text-muted">{new Date(l.synced_at).toLocaleString()}</td>
                  <td className="p-2 text-[10px] font-mono">{l.sync_type}</td>
                  <td className="p-2 text-text-secondary">{l.contacts?.first_name} {l.contacts?.last_name} <span className="text-text-muted">{l.contacts?.email}</span></td>
                  <td className="p-2">
                    <span className={`text-[10px] ${l.action === 'created' ? 'text-success' : l.action === 'updated' ? 'text-accent' : 'text-text-muted'}`}>
                      {l.action}{l.skip_reason && ` (${l.skip_reason})`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-accent' : 'bg-bg-surface'} relative`}
    >
      <div className={`w-5 h-5 rounded-full bg-bg-primary border border-border absolute top-0.5 transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

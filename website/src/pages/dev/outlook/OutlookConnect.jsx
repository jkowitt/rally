import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as auth from '@/services/dev/outlookAuthService'
import * as sync from '@/services/dev/emailSyncService'

/**
 * /dev/outlook/connect
 * OAuth connection page + connection status dashboard.
 */
export default function OutlookConnect() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null)

  const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID
  const tenantId = import.meta.env.VITE_OUTLOOK_TENANT_ID || 'common'
  const redirectUri = import.meta.env.VITE_OUTLOOK_REDIRECT_URI

  useEffect(() => { reload() }, [])

  async function reload() {
    const s = await auth.getConnectionStatus()
    setStatus(s)
    setLoading(false)
  }

  function connect() {
    try {
      auth.startOAuthFlow({ clientId, tenantId, redirectUri })
    } catch (e) {
      setMessage({ kind: 'error', text: e.message })
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect Outlook? Synced emails will remain but no new emails will sync.')) return
    const r = await auth.disconnect()
    setMessage(r.success ? { kind: 'ok', text: 'Disconnected' } : { kind: 'error', text: r.error })
    reload()
  }

  async function refresh() {
    const r = await auth.forceRefresh()
    setMessage(r.success ? { kind: 'ok', text: 'Token refreshed' } : { kind: 'error', text: r.error })
    reload()
  }

  async function syncNow() {
    setSyncing(true)
    const r = await sync.forceSyncNow()
    setSyncing(false)
    setMessage(r?.success ? { kind: 'ok', text: `Synced ${r.synced || 0} emails, ${r.linked || 0} linked` } : { kind: 'error', text: r?.error || 'Sync failed' })
    reload()
  }

  if (loading) return <div className="min-h-screen bg-bg-primary" />

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6 sm:p-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
        <header className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Outlook Connection</div>
          <h1 className="text-2xl font-semibold">Connect Your Outlook Account</h1>
        </header>

        {message && (
          <div className={`text-xs px-3 py-2 rounded ${message.kind === 'ok' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
            {message.text}
          </div>
        )}

        {!status?.is_connected && (
          <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="text-sm text-text-secondary">
              This will open the Microsoft consent screen where you'll pick which email account to connect.
              Required scopes: Mail.Read, Mail.ReadWrite, Mail.Send, Contacts.Read, Calendars.Read, offline_access.
            </div>
            <button
              onClick={connect}
              disabled={!clientId || !redirectUri}
              className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Connect Outlook
            </button>
            {(!clientId || !redirectUri) && (
              <div className="text-[10px] text-warning font-mono">
                Missing env vars: VITE_OUTLOOK_CLIENT_ID and VITE_OUTLOOK_REDIRECT_URI must be set. See /docs/dev/outlook-integration-setup.md
              </div>
            )}
          </div>
        )}

        {status?.is_connected && (
          <div className="space-y-4">
            <div className="bg-bg-card border border-border rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-3">
                <HealthDot health={status.health} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{status.outlook_display_name || 'Connected'}</div>
                  <div className="text-[11px] text-text-muted truncate">{status.outlook_email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="text-text-muted">Last synced</div>
                  <div className="text-text-primary">{status.last_synced_at ? new Date(status.last_synced_at).toLocaleString() : 'Never'}</div>
                </div>
                <div>
                  <div className="text-text-muted">Token expires</div>
                  <div className="text-text-primary">{status.token_expires_at ? new Date(status.token_expires_at).toLocaleString() : '—'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button onClick={syncNow} disabled={syncing} className="bg-accent text-bg-primary py-2.5 rounded text-xs font-semibold hover:opacity-90 disabled:opacity-40">
                {syncing ? 'Syncing…' : 'Force Sync Now'}
              </button>
              <button onClick={refresh} className="border border-border text-text-secondary py-2.5 rounded text-xs hover:border-accent/50 hover:text-accent">
                Re-authenticate
              </button>
              <button onClick={disconnect} className="border border-danger/30 text-danger py-2.5 rounded text-xs hover:bg-danger/10">
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HealthDot({ health }) {
  const color = health === 'healthy' ? 'bg-success' : health === 'expiring' ? 'bg-warning' : 'bg-danger'
  return <div className={`w-3 h-3 rounded-full ${color}`} />
}

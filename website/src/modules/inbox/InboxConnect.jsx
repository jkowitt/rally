import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useToast } from '@/components/Toast'
import { requestEmailNotificationPermission } from '@/hooks/useUnreadEmails'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card } from '@/components/ui'
import { Mail } from 'lucide-react'
import { humanError } from '@/lib/humanError'

// Customer-facing "Connect Your Inbox" page.
//
// Renders a card per available provider (Outlook, Gmail) gated by
// the inbox_outlook + inbox_gmail flags. Clicking Connect bounces
// the user through the OAuth flow handled by the corresponding
// edge function, then returns them here showing connection status.
//
// IMPORTANT: This UI is wired up but the OAuth flow only works
// once the relevant feature flag is on AND the provider's app
// registration is configured (see SETUP_EMAIL_INTEGRATION.md).
export default function InboxConnect() {
  const { profile } = useAuth()
  const { flags } = useFeatureFlags()
  const { toast } = useToast()
  const [outlookConn, setOutlookConn] = useState(null)
  const [gmailConn, setGmailConn] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadConnections() {
    if (!profile?.id) return
    const [{ data: oa }, { data: ga }] = await Promise.all([
      supabase.from('outlook_auth').select('*').eq('user_id', profile.id).maybeSingle(),
      supabase.from('gmail_auth').select('*').eq('user_id', profile.id).maybeSingle(),
    ])
    setOutlookConn(oa)
    setGmailConn(ga)
    setLoading(false)
  }

  useEffect(() => { loadConnections() }, [profile?.id])

  async function startOutlook() {
    try {
      const { data, error } = await supabase.functions.invoke('outlook-auth', {
        body: { action: 'authorize' },
      })
      if (error) throw error
      if (data?.url) window.location.href = data.url
    } catch (err) {
      toast({ title: 'Could not start Outlook connection', description: humanError(err), type: 'error' })
    }
  }

  async function startGmail() {
    try {
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { action: 'authorize' },
      })
      if (error) throw error
      if (data?.url) window.location.href = data.url
    } catch (err) {
      toast({ title: 'Could not start Gmail connection', description: humanError(err), type: 'error' })
    }
  }

  async function disconnect(provider) {
    try {
      const fnName = provider === 'gmail' ? 'gmail-auth' : 'outlook-auth'
      const { error } = await supabase.functions.invoke(fnName, { body: { action: 'disconnect' } })
      if (error) throw error
      toast({ title: `${provider === 'gmail' ? 'Gmail' : 'Outlook'} disconnected`, type: 'success' })
      await loadConnections()
    } catch (err) {
      toast({ title: 'Disconnect failed', description: humanError(err), type: 'error' })
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'CRM & Prospecting', to: '/app' },
        { label: 'Inbox', to: '/app/crm/inbox' },
        { label: 'Connect' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Mail className="w-6 h-6 text-accent" />
          Connect Your Inbox
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Connect Outlook or Gmail and your inbox lives inside the CRM.
          Every new sender becomes a contact automatically; every reply lands on the right deal.
        </p>
      </div>

      <ProviderCard
        name="Outlook"
        provider="outlook"
        flagOn={flags.inbox_outlook}
        connection={outlookConn}
        loading={loading}
        onConnect={startOutlook}
        onDisconnect={() => disconnect('outlook')}
      />

      <ProviderCard
        name="Gmail"
        provider="gmail"
        flagOn={flags.inbox_gmail}
        connection={gmailConn}
        loading={loading}
        onConnect={startGmail}
        onDisconnect={() => disconnect('gmail')}
      />

      <div className="border-t border-border pt-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs text-text-muted leading-relaxed flex-1 min-w-[260px]">
          <strong className="text-text-secondary">Privacy:</strong> We only read mail you receive
          and send. Bodies are stored encrypted at rest. You can disconnect at any time and your
          emails stop syncing instantly. We never send mail without your explicit action.
        </div>
        <button
          onClick={async () => {
            const result = await requestEmailNotificationPermission()
            if (result === 'granted') toast({ title: 'Desktop notifications on', description: 'You\'ll see a popup when new emails arrive.', type: 'success' })
            else if (result === 'denied') toast({ title: 'Permission denied', description: 'Allow notifications in your browser settings to enable popups.', type: 'warning' })
          }}
          className="text-xs px-3 py-1.5 border border-border rounded text-text-secondary hover:text-text-primary hover:border-accent/50 whitespace-nowrap"
          title="Allow desktop popups for new inbound emails"
        >
          🔔 Enable desktop notifications
        </button>
        <a
          href="/app/crm/inbox/signature"
          className="text-xs px-3 py-1.5 border border-border rounded text-text-secondary hover:text-text-primary hover:border-accent/50 whitespace-nowrap"
        >
          ✍ Manage signature
        </a>
      </div>
    </div>
  )
}

function ProviderCard({ name, provider, flagOn, connection, loading, onConnect, onDisconnect }) {
  const connected = connection?.is_connected
  const email = connection?.[provider === 'gmail' ? 'gmail_email' : 'outlook_email']

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-text-primary">{name}</span>
            {connected && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-success bg-success/10 px-1.5 py-0.5 rounded">
                Connected
              </span>
            )}
            {!flagOn && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted bg-bg-card px-1.5 py-0.5 rounded">
                Coming soon
              </span>
            )}
          </div>
          {connected && email && (
            <div className="text-xs text-text-muted mt-1 font-mono">{email}</div>
          )}
          {connected && connection?.last_synced_at && (
            <div className="text-xs text-text-muted mt-0.5">
              Last synced {new Date(connection.last_synced_at).toLocaleString()}
            </div>
          )}
        </div>
        <div className="shrink-0">
          {loading ? (
            <span className="text-xs text-text-muted">Loading…</span>
          ) : connected ? (
            <Button variant="secondary" size="sm" onClick={onDisconnect}>
              Disconnect
            </Button>
          ) : flagOn ? (
            <Button onClick={onConnect}>
              Connect {name}
            </Button>
          ) : (
            <Button variant="secondary" disabled title="Coming soon">
              Not yet available
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

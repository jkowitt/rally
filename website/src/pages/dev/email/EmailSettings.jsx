import { Link } from 'react-router-dom'

/**
 * /app/marketing/email/settings — high-level email marketing configuration.
 * Most provider-level settings (Resend API key, webhook URLs) live
 * in Supabase Edge Function secrets and DNS records. This page
 * documents them and links to setup docs.
 */
export default function EmailSettings() {
  const webhookUrl = `${window.location.origin}/functions/v1/email-marketing-webhook`
  const unsubUrl = `${window.location.origin}/functions/v1/email-marketing-unsubscribe`
  const trackUrl = `${window.location.origin}/functions/v1/email-marketing-track`

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <h2 className="text-xl font-semibold">Email Settings</h2>
        <p className="text-[11px] text-text-muted">Provider, webhooks, and compliance configuration</p>
      </header>

      <Section title="Sending Identity">
        <Row label="From name" value="Set via FROM_NAME Supabase secret" />
        <Row label="From email" value="Set via FROM_EMAIL Supabase secret" />
        <Row label="Default reply-to" value="Set per campaign in the builder" />
      </Section>

      <Section title="Email Provider">
        <Row label="Primary provider" value="Resend (via RESEND_API_KEY)" />
        <Row label="Fallback provider" value="SendGrid (via SENDGRID_API_KEY)" />
        <div className="text-[10px] text-text-muted mt-2">
          All outgoing emails route through the shared <code>send-email</code> edge function.
          This page uses <code>email-marketing-send</code> which wraps it with tracking + unsubscribe injection.
        </div>
      </Section>

      <Section title="Webhook Endpoints">
        <Row label="Provider events" value={webhookUrl} mono copy />
        <div className="text-[10px] text-text-muted mt-1 mb-3">
          Configure your Resend webhook (or SendGrid event webhook) to POST to this URL.
          Include <code>x-webhook-secret</code> header with the value of <code>EMAIL_WEBHOOK_SECRET</code>.
        </div>
        <Row label="Unsubscribe" value={unsubUrl} mono copy />
        <Row label="Open pixel / click redirect" value={trackUrl} mono copy />
      </Section>

      <Section title="Compliance">
        <Row label="Unsubscribe header" value="List-Unsubscribe + List-Unsubscribe-Post (RFC 8058)" />
        <Row label="Physical address" value="Include in every template footer" />
        <Row label="Suppression list" value="Enforced before every send" />
      </Section>

      <Section title="Deliverability Checklist">
        <Row label="SPF record" value="v=spf1 include:resend.com ~all" mono />
        <Row label="DKIM" value="Configured in Resend dashboard → DNS records" />
        <Row label="DMARC" value='v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com' mono />
        <Row label="MX (inbound)" value="Required for Resend inbound parsing" />
      </Section>

      <div className="bg-bg-card border border-border rounded-lg p-4 text-xs">
        <div className="text-sm font-semibold mb-2">Full setup guide</div>
        <Link to="#" className="text-accent hover:underline">docs/app/marketing/email-marketing-setup.md</Link>
        <div className="text-[10px] text-text-muted mt-1">Includes DNS records, webhook configuration, and inbound routing setup.</div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">{title}</div>
      <div className="bg-bg-card border border-border rounded-lg p-4 space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value, mono = false, copy = false }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <div className="text-text-muted shrink-0 w-40">{label}</div>
      <div className={`text-text-primary text-right min-w-0 flex-1 ${mono ? 'font-mono text-[11px]' : ''} break-all`}>
        {value}
        {copy && (
          <button
            onClick={() => navigator.clipboard.writeText(value)}
            className="ml-2 text-[9px] text-accent"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  )
}

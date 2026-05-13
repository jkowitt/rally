# Email Marketing — Developer Setup Guide

**Private to the developer role** until the `email_marketing_public` flag
is toggled on. Lives behind `email_marketing_developer` feature flag.
Nothing in this system ships to non-developer users until both flags
are explicitly enabled.

---

## 1. Database Migration

Apply `supabase/migrations/054_email_marketing_system.sql`. Verify:

```sql
-- All 17 email marketing tables + pipeline_sync_queue
select tablename from pg_tables
where schemaname = 'public' and (tablename like 'email_%' or tablename like 'pipeline_sync%')
order by tablename;

-- Every policy uses can_access_email_marketing() or a property-scoped variant
select tablename, policyname from pg_policies
where tablename like 'email_%' or tablename like 'pipeline_sync%'
order by tablename, policyname;
```

Migration 054 also:
- Inserts `email_marketing_developer` and `email_marketing_public` flag rows (default OFF)
- Creates a trigger on `contacts` that enqueues new contacts for auto-sync
- Adds three SQL helper functions: `can_access_email_marketing_dev()`,
  `can_access_email_marketing_public()`, `can_access_email_marketing()`

---

## 2. Email Provider Configuration

This system reuses the existing Resend (primary) / SendGrid (fallback)
setup from `supabase/functions/send-email`. Required env vars in
**Supabase Dashboard → Edge Functions → Secrets**:

```
RESEND_API_KEY=<your resend api key>
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Loud CRM

# Optional fallback
SENDGRID_API_KEY=<your sendgrid api key>

# Webhook verification (required in production)
EMAIL_WEBHOOK_SECRET=<openssl rand -base64 32>

# Cron job auth
CRON_SECRET=<openssl rand -base64 32>

# Public app URL used in unsubscribe + tracking links
APP_URL=https://loud-legacy.com
```

And in Vite (`.env.local`):

```
VITE_SUPABASE_URL=<your supabase project url>
```

---

## 3. Deploy Edge Functions

```bash
supabase functions deploy email-marketing-send
supabase functions deploy email-marketing-track
supabase functions deploy email-marketing-webhook
supabase functions deploy email-marketing-pipeline-sync
supabase functions deploy email-marketing-unsubscribe
```

### Scheduled invocations

| Function | Schedule | Headers |
|---|---|---|
| `email-marketing-pipeline-sync` | every 5 minutes | `x-cron-secret: <CRON_SECRET>` |

Set up in **Supabase Dashboard → Edge Functions → Schedules**.

### Webhook configuration

Configure Resend webhook (or SendGrid event webhook) to POST to:

```
https://<your-project>.supabase.co/functions/v1/email-marketing-webhook
```

Custom header: `x-webhook-secret: <EMAIL_WEBHOOK_SECRET>`

Events to subscribe to:
- `email.sent`, `email.delivered`, `email.bounced`, `email.complained`
- Inbound email (if using Resend inbound parsing)

---

## 4. DNS Records for Deliverability

Add these to your sending domain's DNS. Values shown are for Resend;
SendGrid has equivalent records with different subdomains.

| Type | Host | Value | Purpose |
|---|---|---|---|
| TXT | @ | `v=spf1 include:_spf.resend.com ~all` | SPF |
| CNAME | `resend._domainkey` | (from Resend dashboard) | DKIM |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com` | DMARC |
| MX | `inbound` | `10 feedback-smtp.resend.com` | Inbound parsing (optional) |

Verify with:

```bash
dig TXT yourdomain.com +short
dig TXT _dmarc.yourdomain.com +short
dig CNAME resend._domainkey.yourdomain.com +short
```

---

## 5. Inbound Reply Routing

Email replies are captured via the provider's inbound webhook. Two
identification methods are used in parallel:

1. **Custom headers** — every outgoing campaign includes
   `X-LL-Campaign-ID` and `X-LL-Send-ID` headers. The webhook reads
   these to identify which campaign the reply belongs to.
2. **Message ID threading** — stored `provider_message_id` lets us
   match replies even if headers are stripped.

Conversations are created automatically when:
- An inbound email arrives from a known subscriber
- No open conversation exists for that subscriber + campaign

On reply, the system also:
- Pauses any active sequence enrollments for the subscriber
- Creates a CRM activity row if the subscriber is linked to a deal
- Bumps the subscriber's engagement score
- Marks the original send row as `replied`

---

## 6. First-time Setup Flow

1. Sign in as the developer account
2. Navigate to `/dev/feature-flags` and toggle
   `email_marketing_developer` **ON**
3. Navigate to `/dev/email`
4. Go to **Templates** — the 8 default templates seed automatically
5. Go to **Lists** and create at least one list (e.g. "Pipeline Contacts")
6. Go to **Pipeline Sync → Auto-Sync Settings** and enable auto-sync,
   selecting your target list
7. Go to **Pipeline Sync** and run a bulk sync of existing CRM contacts
8. Go to **Campaigns** and create your first campaign
9. Send a test campaign to yourself, reply, and verify:
   - The reply shows up in **Conversations** as a new thread
   - The campaign's `reply_count` increments
   - A CRM activity is created on any linked deal
   - Any active sequences for that subscriber are paused

---

## 7. Access Isolation Verification

Before rolling this to production:

1. Sign in as a non-developer user. Try visiting `/dev/email/*` directly.
   **Every URL must silently redirect to `/app`.**
2. Try calling any edge function with a non-developer JWT:
   ```
   curl -X POST https://<project>.supabase.co/functions/v1/email-marketing-send \
     -H "Authorization: Bearer <non-dev-jwt>" \
     -d '{"campaign_id":"anything"}'
   ```
   **Must return HTTP 404.**
3. Sign in as the developer but leave the flag OFF. Verify `/dev/email`
   redirects to `/app`.
4. Check `pg_policies` — every email_* policy must use
   `can_access_email_marketing()` or its variants.

---

## 8. Toggle-to-Public

When you're ready to make email marketing available to admin users:

1. `/dev/feature-flags` → toggle `email_marketing_public` **ON**
2. Admin users can now access `/email/*` (currently redirects to the
   same shared UI under `/dev/email`, but properly gated on admin+ role)
3. RLS automatically permits admin+ users to read/write their own
   `property_id`-scoped rows (via `can_access_email_marketing_public()`)
4. Cross-tenant isolation is enforced at the SELECT policy level

---

## 9. Rate Limits & Performance

- **Resend**: 10 requests/second sustained, 100 emails per API call.
  The send edge function sends one at a time and batches 100 per
  invocation — well under the limit.
- **Tracking endpoints** (`email-marketing-track`): target < 100ms.
  Open pixel writes are fire-and-forget, click redirects do one
  blocking DB read then redirect.
- **Pipeline sync cron**: drains the queue 100 rows at a time, clears
  expired recent-add flags in the same run.
- **Webhook idempotency**: duplicate webhook deliveries are safe —
  every handler is a SET-based update, not an increment.

---

## 10. Email Client Compatibility

Template HTML follows these rules for Gmail/Outlook/Apple Mail/mobile:

- Table-based layouts (no flexbox, no CSS grid)
- Inline styles only (no `<style>` blocks — some clients strip them)
- 600px max content width
- Dark-mode-friendly colors (explicit background + text colors)
- All images have width and height attributes
- `<img>` alt text present
- `{{unsubscribe_url}}` merge tag required in footer (enforced by
  the campaign validator)

The seeded templates follow all these rules. Custom HTML pasted into
the editor is not validated — use responsibly.

---

## 11. What's deliberately NOT built yet

- **Visual block-based template editor** — current editor is raw HTML.
  The seeded templates provide starting points you can edit directly.
  A block editor adds significant surface area and is deferred until
  there's demand.
- **A/B tests** — the database schema supports `ab_variant_subject`
  and `ab_variant_html`, but the UI for creating variants and auto-
  picking winners is not built. The campaign builder treats every
  campaign as single-variant.
- **Sequence builder UI** — existing sequences from migration 051
  (`email_sequences`) continue to run via the existing
  `emailSequenceService`. No new UI for creating sequences in this
  migration; reply-pause on those sequences IS wired via the webhook.
- **Per-send conversation attachments** — inbound attachments are
  captured in the `attachments` jsonb column but not rendered in the
  conversation UI. Add to the EmailConversations page when needed.

---

## 12. Assumptions that need verification

1. **Resend is the email provider** — confirmed from
   `supabase/functions/send-email/index.ts`. If you switch providers,
   update `email-marketing-send` and `email-marketing-webhook` accordingly.
2. **`contacts.company` is the org field** — confirmed from migration
   010. All pipeline sync code reads this, not `organization`.
3. **`activities` table accepts `'Email'` and `'Email Sent'` as
   `activity_type`** — if `activity_type` is a CHECK constraint
   instead of free text, add those values to the allowed list.
4. **`profiles.property_id` is the tenant scope** — confirmed from
   existing `get_user_property_id()` helper.
5. **`contract-ai` edge function has `draft_email` action** — confirmed,
   used by the smart reply feature.
6. **Resend inbound parsing is enabled** — if not, replies won't be
   captured. Alternative: point MX at your own inbound handler that
   POSTs to `email-marketing-webhook`.

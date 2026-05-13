# Email integration setup (Outlook + Gmail)

This document covers what a human dev needs to do **outside the codebase** to make
the unified inbox feature actually work. Without these steps, the UI renders and
the routes resolve but the OAuth flows return errors.

## What's already built

- ✅ Database schema for both providers (`outlook_*`, `gmail_*` tables, multi-tenant via `property_id`)
- ✅ `email_messages_unified` view that merges Outlook + Gmail into a provider-agnostic feed
- ✅ Auto-create-contact on first email from an unknown sender
- ✅ Customer-facing UI: `/app/crm/inbox/connect`, `/app/crm/inbox`, ComposeEmail modal
- ✅ Outlook edge functions (`outlook-auth`, `outlook-graph`, `outlook-token-refresh`, `outlook-delta-sync`)
- ✅ Gmail edge function stubs (`gmail-auth`, `gmail-graph`)
- ✅ Feature flags `inbox_outlook` + `inbox_gmail` (default OFF)

## What needs human setup

### 1. Microsoft Entra ID (Outlook)

If Outlook isn't already registered:

1. Go to <https://entra.microsoft.com> → App registrations → New registration
2. Name: "Loud CRM Inbox"
3. Supported account types: **Multitenant + personal Microsoft accounts**
4. Redirect URI (Web): `https://yourdomain.com/auth/outlook/callback`
5. Register
6. Copy the **Application (client) ID**
7. **Certificates & secrets** → New client secret → copy the value (you won't see it again)
8. **API permissions** → Add permission → Microsoft Graph → Delegated:
   - `offline_access`, `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`,
     `Contacts.Read`, `Contacts.ReadWrite`, `Calendars.Read`, `User.Read`
9. **Grant admin consent** (button at top)

Set Supabase secrets (Project Settings → Edge Functions → Secrets):

```
OUTLOOK_CLIENT_ID=<app id>
OUTLOOK_CLIENT_SECRET=<secret value>
OUTLOOK_TENANT_ID=common
OUTLOOK_REDIRECT_URI=https://yourdomain.com/auth/outlook/callback
OUTLOOK_TOKEN_SECRET=<32-byte random hex string for AES-GCM>
```

### 2. Google Cloud (Gmail)

1. Go to <https://console.cloud.google.com> → create project "Loud CRM"
2. **APIs & Services → Library** → enable **Gmail API**
3. **OAuth consent screen** → External → fill in app name, support email,
   developer contact → save
4. **Credentials** → Create Credentials → OAuth client ID → Web application
5. Authorized JavaScript origins: `https://yourdomain.com`
6. Authorized redirect URIs: `https://yourdomain.com/auth/gmail/callback`
7. Create → copy the **Client ID** and **Client secret**
8. Add scopes on consent screen:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.send`
   - `openid email profile`
9. Submit consent screen for verification (required before going live with
   public users; testing mode supports up to 100 test users)

Set Supabase secrets:

```
GMAIL_CLIENT_ID=<client id>
GMAIL_CLIENT_SECRET=<client secret>
GMAIL_REDIRECT_URI=https://yourdomain.com/auth/gmail/callback
```

(Reuse `OUTLOOK_TOKEN_SECRET` for Gmail — same encryption key works for both.)

### 3. Apply the migration + deploy edge functions

```bash
cd website
# Push migration 072 (adds gmail_* tables + property_id to outlook_*)
supabase db push --password "$SUPABASE_DB_PASSWORD"

# Deploy the new + updated edge functions
supabase functions deploy outlook-auth --project-ref <ref>
supabase functions deploy outlook-graph --project-ref <ref>
supabase functions deploy gmail-auth --project-ref <ref>
supabase functions deploy gmail-graph --project-ref <ref>
```

### 4. OAuth callback routes

The OAuth providers redirect to `/auth/outlook/callback` and
`/auth/gmail/callback`. Wire those routes up in `App.jsx` to call the
matching `exchange_code` action:

```jsx
// Pseudocode — write actual handlers per existing OutlookCallback.jsx
const code = new URLSearchParams(window.location.search).get('code')
await supabase.functions.invoke('gmail-auth', { body: { action: 'exchange_code', code } })
navigate('/app/crm/inbox/connect')
```

The Outlook callback already exists at `src/pages/dev/OutlookCallback.jsx`
under the dev-only routes; copy + adapt for the customer-facing path.

### 5. Flip the feature flags

In the Dev Tools → Feature Flags console (`/app/developer?tab=flags`), turn on:

- `inbox_outlook`
- `inbox_gmail`

These are off by default specifically so the Connect buttons stay disabled
until OAuth apps are registered.

### 6. Schedule the sync cron

The existing `outlook-delta-sync` runs on a 15-minute cron. Add an equivalent
for Gmail by either:

- **Polling**: schedule a `gmail-delta-sync` cron that calls `gmail-graph`
  with `action: 'sync'` for each connected user.
- **Push**: set up Gmail Pub/Sub watch (more complex, real-time). Requires
  enabling Pub/Sub in Google Cloud and a webhook receiver edge function.

For v1, polling at 5-15 min intervals is fine.

## Known gaps in the stubs

The Gmail edge function is **functional but minimal**:

- Initial sync only — no `history.list` incremental sync yet (TODO marked in code)
- No webhook/push notifications — polling only
- Multi-part MIME parsing is simple; complex emails may render incompletely
- No attachment download (flag captured but content not fetched)

The Outlook edge functions are more complete (production-tested under the
developer-only flag), but were not designed for multi-tenant load. Watch for
RLS performance under high concurrency.

## Cost expectations

- **Microsoft Graph**: free tier covers most use; 10,000 requests/min cap
- **Gmail API**: 1 billion quota units/day free; ~5 units per message read,
  ~100 units per send; comfortably free for normal use
- **Pub/Sub** (if you add push for Gmail): ~$0.06/million messages

## Estimated remaining effort

- Wire callback routes: 2-4 hours
- Test OAuth flows end-to-end: 2-4 hours
- Build Gmail incremental sync: 1-2 days
- Polish Compose UI (rich text, attachments, signatures): 2-3 days
- Production hardening (token rotation, error monitoring, retry logic): 2-3 days

**Total: ~1 week to ship this to a beta cohort, ~2-3 weeks to full GA.**

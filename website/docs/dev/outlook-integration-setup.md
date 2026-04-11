# Outlook Integration — Developer Setup Guide

**Private to the developer role.** This document walks through wiring up
the `/dev/outlook/*` integration that lives behind the `outlook_integration`
feature flag. Nothing in this feature ships to users.

---

## 1. Azure App Registration

1. Sign in to <https://portal.azure.com> with a Microsoft account that can
   register apps. A personal or work account both work; use whatever owns
   the Outlook mailbox you want to connect.
2. In the left sidebar → **Microsoft Entra ID** → **App registrations** → **+ New registration**.
3. Fill in:
   - **Name**: `Loud Legacy — Dev Outlook Integration`
   - **Supported account types**: *Accounts in any organizational directory and personal Microsoft accounts*
     (this is the `common` tenant and lets you connect both a work and personal mailbox).
   - **Redirect URI** → platform **Web** → `https://loud-legacy.com/dev/outlook/callback`
     For local dev, also add `http://localhost:5173/dev/outlook/callback`.
4. Click **Register**. Copy the **Application (client) ID** — this becomes `OUTLOOK_CLIENT_ID`.
5. The **Directory (tenant) ID** on the same page is `OUTLOOK_TENANT_ID`.
   For a multi-account app, leave this as `common` (the string, not the GUID).

### Required API Permissions

Go to **API permissions** → **+ Add a permission** → **Microsoft Graph** →
**Delegated permissions**. Add each of these and click **Add permissions**:

| Permission | Purpose |
|---|---|
| `offline_access` | Required to receive a refresh token |
| `User.Read` | Read the connected user's profile (display name + email) |
| `Mail.Read` | Read inbox/sent emails for sync |
| `Mail.ReadWrite` | Write back metadata (mark as read, etc. — future use) |
| `Mail.Send` | Optional: direct send via Graph API (currently we use `mailto:` instead) |
| `Contacts.Read` | Read existing Outlook contacts |
| `Contacts.ReadWrite` | Future use — create contacts from prospects |
| `Calendars.Read` | Future use — pull calendar events into deal timeline |

After adding permissions, click **Grant admin consent for ...** if you're
a tenant admin. For personal accounts, the consent happens at first sign-in.

### Client Secret

1. **Certificates & secrets** → **+ New client secret**.
2. Description: `loud-legacy-dev-outlook`. Expiry: **24 months**.
3. Click **Add**, then **immediately copy the `Value` field**. You cannot
   retrieve it later. This becomes `OUTLOOK_CLIENT_SECRET`.

### Redirect URIs

Verify all three URIs are registered under **Authentication → Web**:

- `https://loud-legacy.com/dev/outlook/callback` (prod)
- `http://localhost:5173/dev/outlook/callback` (local vite)
- `https://<your-staging-host>/dev/outlook/callback` (staging, if any)

---

## 2. Environment Variables

Store all secrets in **Supabase Dashboard → Edge Functions → Secrets**
(for server-side use) and in the Vite `.env.local` (for client-side public
values only). **Never commit either to git.**

### Supabase Edge Function secrets (server-side — encrypted at rest)

```
OUTLOOK_CLIENT_ID=<app registration client id>
OUTLOOK_CLIENT_SECRET=<client secret value>
OUTLOOK_TENANT_ID=common
OUTLOOK_REDIRECT_URI=https://loud-legacy.com/dev/outlook/callback
OUTLOOK_SCOPES="offline_access Mail.Read Mail.ReadWrite Mail.Send Contacts.Read Contacts.ReadWrite Calendars.Read User.Read"
OUTLOOK_TOKEN_SECRET=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -base64 32>
HOOK_SECRET=<openssl rand -base64 32>
```

- `OUTLOOK_TOKEN_SECRET` is used by `_shared/cryptoTokens.ts` to AES-GCM
  encrypt access/refresh tokens before writing to `outlook_auth`. If you
  ever rotate this, all connected accounts need to reconnect.
- `CRON_SECRET` is the header value the scheduled `outlook-token-refresh`
  and `outlook-delta-sync` functions verify in `x-cron-secret`.
- `HOOK_SECRET` protects the signup webhook.

### Vite env (client-side — public values only, no secrets)

```
VITE_OUTLOOK_CLIENT_ID=<same client id>
VITE_OUTLOOK_TENANT_ID=common
VITE_OUTLOOK_REDIRECT_URI=https://loud-legacy.com/dev/outlook/callback
```

The client ID is a public identifier; it's safe in the bundle. The client
secret must never appear in Vite/client code.

---

## 3. Database Migration

Apply `supabase/migrations/053_developer_outlook_integration.sql` either
via the Supabase dashboard SQL editor or via `supabase db push`. Verify
with:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename like 'outlook_%';
```

All six `outlook_*` tables should report `rowsecurity = true`. Run:

```sql
select * from pg_policies where tablename like 'outlook_%';
```

Every policy should use `is_developer()` — if any policy uses `true` or
omits the check, the integration is leaking and must be fixed before
enabling the flag.

---

## 4. Deploy Edge Functions

From the repo root:

```bash
supabase functions deploy outlook-auth
supabase functions deploy outlook-graph
supabase functions deploy outlook-token-refresh
supabase functions deploy outlook-delta-sync
supabase functions deploy outlook-prospect-signup-webhook
```

### Scheduled invocations

Set up cron schedules in Supabase Dashboard → Edge Functions →
**Schedules**. Both scheduled functions require the `x-cron-secret` header.

| Function | Schedule | Headers |
|---|---|---|
| `outlook-token-refresh` | every 30 minutes | `x-cron-secret: <CRON_SECRET>` |
| `outlook-delta-sync` | every 15 minutes | `x-cron-secret: <CRON_SECRET>` |

### Signup webhook

Dashboard → **Authentication → Hooks** → add a webhook on `user.created`
pointing at the `outlook-prospect-signup-webhook` function, with
`x-hook-secret: <HOOK_SECRET>` as a header.

---

## 5. First-time Connection

1. Sign in as the developer account.
2. Navigate to `/dev/feature-flags` and toggle `outlook_integration` to ON.
3. Navigate to `/dev/outlook/connect` and click **Connect Outlook**.
4. Complete the Microsoft consent flow.
5. After redirect back to `/dev/outlook/callback`, you'll land on
   `/dev/outlook/dashboard`. Click **Sync now** to run the initial
   90-day backfill.

---

## 6. Verifying Access Isolation

Before flipping the flag on in production, verify:

1. Sign in as a non-developer user. Try visiting every `/dev/*` URL
   directly. **Every one should silently redirect to `/app`.**
2. Try calling the edge functions with a non-developer JWT:
   ```
   curl -X POST https://<project>.supabase.co/functions/v1/outlook-graph \
     -H "Authorization: Bearer <non-dev-jwt>" \
     -d '{"action":"get_profile"}'
   ```
   **Must return HTTP 404** (not 403), so the endpoint appears not to exist.
3. Sign in as the developer but with the flag OFF. Verify `/dev/outlook/*`
   routes still redirect to `/app` (only `/dev` home and `/dev/feature-flags`
   stay accessible).
4. Check `pg_policies` — every `outlook_*` policy must use `is_developer()`.

---

## 7. Microsoft Graph Rate Limits

Microsoft Graph enforces per-app and per-tenant throttling. Relevant limits
for this integration:

- **Mail: 10,000 requests per 10 minutes per mailbox** — ample headroom
  for a single developer's mailbox on a 15-minute delta cadence.
- **Delta queries are preferred** — each delta call counts as one request
  regardless of how many messages it returns. Initial full sync can burn
  ~10 requests (paginated) but delta sync usually returns 1–5 results per
  15-minute window.
- **429 responses** include a `Retry-After` header. The current `outlook-graph`
  function does not auto-retry — if you hit 429, the sync log will record
  the error and the next cron tick will retry naturally.

**Practical expected usage**: ~100 requests/day for delta sync + ad-hoc
dashboard browsing. Well under every relevant limit.

---

## 8. Disabling the Integration

To kill the integration without removing code:

1. Navigate to `/dev/feature-flags` and toggle `outlook_integration` OFF.
2. All `/dev/outlook/*` routes immediately become inaccessible.
3. All edge functions return 404 to any caller.
4. The delta-sync cron skips this tick entirely (`{"skipped": true, "reason": "flag off"}`).
5. Already-synced emails remain in `outlook_emails` but are invisible to
   non-developers due to RLS.

To fully disconnect a connected account, visit `/dev/outlook/connect` and
click **Disconnect**. This clears the stored tokens but leaves synced
emails intact.

---

## 9. Data Isolation Guarantees

- `outlook_prospects` has **no `property_id`, no `deal_id`, no `contact_id`**.
  It is a fully isolated table that never references customer CRM data.
- `outlook_emails.linked_contact_id` and `linked_deal_id` reference the
  main `contacts`/`deals` tables BUT the reverse direction is not used —
  the customer CRM has no foreign keys pointing into `outlook_*` tables.
- Turning off the `outlook_integration` flag immediately severs any deal
  timeline surface area without touching the underlying activity rows.

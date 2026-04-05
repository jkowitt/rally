# Apollo.io + Hunter.io Integration Setup

## What You Get
- **Apollo.io** (~$49/mo): 275M verified contacts, company firmographics, buying intent signals
- **Hunter.io** (~$39/mo): Real-time email verification, domain search

## Setup Steps

### 1. Get API Keys

**Apollo.io**
1. Sign up at https://www.apollo.io/
2. Go to Settings → Integrations → API
3. Copy your API key
4. Recommended plan: **Basic** ($49/mo, 500 credits/month)

**Hunter.io**
1. Sign up at https://hunter.io/
2. Go to API → API Access
3. Copy your API key
4. Recommended plan: **Starter** ($39/mo, 500 verifications/month)

### 2. Add Keys to Supabase

Run these commands in your terminal (replace with your actual keys):

```bash
supabase secrets set APOLLO_API_KEY=your_apollo_key_here
supabase secrets set HUNTER_API_KEY=your_hunter_key_here
```

Or add them via the Supabase Dashboard:
- Dashboard → Project Settings → Edge Functions → Secrets
- Add `APOLLO_API_KEY` and `HUNTER_API_KEY`

### 3. Deploy Edge Functions

```bash
cd website
supabase functions deploy apollo-enrichment
supabase functions deploy hunter-verify
```

### 4. Run Database Migration

```bash
supabase db push
```

Migration 015 adds:
- `contact_research` cache table (30-day TTL, reduces API costs)
- `api_usage` table (tracks credits per property)
- Email verification columns on `contacts` table
- Apollo firmographic columns on `deals` table

### 5. Verify It Works

In the app:
1. Open any deal → Contacts tab
2. Click "AI Find Contacts"
3. Look for toast: "Verified via Apollo.io" (green) vs "AI-researched (unverified)" (orange)
4. Contact cards show `✓ Apollo` badge for verified data
5. Email fields show ✓ after verification

## How It Works

**Tier 1 - Apollo (primary)**
- Finds top 3 decision-makers with verified names, titles, LinkedIn URLs, and emails
- Real data from live LinkedIn + company sources
- Returns `source: 'apollo'` flag
- UI shows green ✓ Apollo badge

**Tier 2 - Claude AI (fallback)**
- Used when Apollo has no data or API unavailable
- Generates realistic but unverified contacts
- Returns `source: 'claude'` flag
- UI shows orange "AI" badge

**Email Verification (Hunter.io)**
- Click "Verify" next to any email
- Checks MX records + SMTP + disposable domains
- Returns verified / invalid / risky / unknown
- Green ✓ = deliverable, Red ✗ = invalid, Orange ⚠ = risky

## Cost Management

Cached results reuse for 30 days (no repeated API calls for same company).

Track usage:
```sql
SELECT service, count(*) as calls, sum(credits_used) as credits
FROM api_usage
WHERE called_at > now() - interval '30 days'
GROUP BY service;
```

Typical usage for a sports property:
- 20 prospects/month researched via Apollo → 20 credits
- 60 emails verified (3 per prospect) → 60 Hunter credits
- Total: ~$88/mo at recommended tiers

## Fallback Behavior

If API keys are not configured, the system automatically falls back to Claude AI research. No crashes, just reduced accuracy (marked with orange "AI" badges).

You can start using the app immediately without Apollo/Hunter — add them when ready to level up to verified data.

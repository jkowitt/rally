# Pricing Control Center — Developer Setup

Database-driven pricing architecture. Every price, limit, feature flag,
credit cost, addon price, and pricing-page content string lives in
Supabase. `planLimits.js` is now a thin cache client. The developer
control center at `/dev/pricing` lets you change any of these at runtime.

---

## 1. Apply migration 055

```
supabase db push
```

Migration 055 creates 13 new tables and seeds them with values that
exactly match the previous hardcoded `planLimits.js`. Existing customers
see zero behavior change immediately after migration — prices,
limits, and features are identical to what's in the code.

Verify:

```sql
select plan_key, monthly_price_cents, annual_price_cents
from pricing_plans
order by display_order;

select count(*) from plan_limits;          -- should be ~28 (7 × 4 plans)
select count(*) from plan_features;        -- should be ~40
select count(*) from ai_credit_costs;      -- 10
select count(*) from ai_credit_packs;      -- 3
select count(*) from addons;               -- 7
select count(*) from pricing_page_faqs;    -- 6
```

---

## 2. Stripe env vars

The existing Stripe integration already has most of what's needed. The
new `stripe-pricing-sync` edge function adds one optional var:

```
STRIPE_SECRET_KEY=sk_live_...          # existing
STRIPE_PRODUCT_ID=prod_xxx             # optional — if set, all new prices
                                       # attach to this product instead of
                                       # creating one per sync call
```

---

## 3. Deploy edge functions

```
supabase functions deploy reset-monthly-credits
supabase functions deploy stripe-pricing-sync
supabase functions deploy pricing-cache-invalidate
```

Schedule `reset-monthly-credits` to run at **00:05 UTC on the 1st of every
month** via Supabase `pg_cron` or external scheduler. It requires the
`x-cron-secret` header (reuses the existing `CRON_SECRET` from migration 053).

---

## 4. Stripe price ID setup

Because you're starting with `null` Stripe price IDs on every row, the
fastest path is:

1. Sign in as developer → `/dev/pricing`
2. Stripe health banner at top shows red
3. Click **Sync all to Stripe** in the banner
4. Wait ~10 seconds — the edge function creates prices for every plan,
   addon, and credit pack and writes the IDs back to the database

Alternatively, for each plan or addon individually:
- `/dev/pricing/plans` → click **Sync** on the row
- `/dev/pricing/addons` → click **Sync** on the card
- `/dev/pricing/ai-credits` → click **Sync** on the pack

Every sync is idempotent — calling it twice creates two Stripe prices
(Stripe doesn't dedupe by nickname). Only call when you actually need
new prices. For production, set `STRIPE_PRODUCT_ID` and manually
create prices in Stripe dashboard to keep things clean.

---

## 5. How the cache works

`src/config/planLimits.js` is now a **hybrid sync/async module**:

- On first import, it hydrates the cache from the database
  asynchronously (non-blocking)
- Until the DB responds, it returns hardcoded fallback defaults
  that exactly match the seeded values — so existing callers never
  see undefined
- Cache TTL is **5 minutes**. On every sync getter call
  (`PLAN_LIMITS.pro.deals`, `planHasFeature(...)`, etc.), if the cache
  is stale it kicks off a non-blocking re-fetch
- `invalidateCache()` is called automatically after every write in
  `pricingService.js`, so developer changes propagate within a
  few seconds in the developer's own browser and within 5 minutes
  for other users

The **7 existing consumers** of `planLimits.js` were not touched:
- `src/components/upgrade/UpgradeModal.jsx`
- `src/components/upgrade/FeatureGate.jsx`
- `src/components/upgrade/PlanComparisonTable.jsx`
- `src/hooks/useUpgrade.js`
- `src/services/usageTracker.js`
- `src/services/upgradePromptService.js`
- `src/services/upgradeOpportunityService.js`

They continue to use the same synchronous API (`PLAN_LIMITS`,
`planHasFeature`, etc.) and get DB values transparently.

---

## 6. Access isolation

- `/dev/pricing/*` is inside `DevRouter` which requires
  `profile?.role === 'developer'`. Non-developers silently redirect
  to `/app` before any chunk loads.
- `/pricing` is fully public.
- `/settings/addons` and `/settings/billing` are inside the
  authenticated `/app/*` shell — any logged-in user can access their
  own billing.
- RLS on all pricing tables: public read for everything a pricing
  page needs, developer-only write, plus per-property scoping for
  `organization_ai_credits`, `organization_addons`, and
  `organization_billing`.

---

## 7. Credit gate usage

To gate any AI feature call on credits:

```jsx
import { CreditGate } from '@/components/credits/CreditComponents'

<CreditGate featureKey="contract_upload">
  <button onClick={parseContract}>Parse contract</button>
</CreditGate>
```

Or programmatically:

```js
import { withCredits } from '@/services/aiCreditService'

const result = await withCredits(
  profile.property_id,
  'contract_upload',
  profile.id,
  () => callClaudeContractParser(pdfBuffer)
)
```

`withCredits` checks balance first, then runs your callback, then
deducts credits only if the callback succeeds. If the AI call throws,
credits are NOT deducted.

**Note**: the existing AI feature calls (e.g., `contract-ai` edge
function invocations in Contract Manager, Deal Insights, etc.) are
NOT yet wrapped with `withCredits()`. That's a follow-up refactor —
the credit system is fully functional and the wrapping just needs
to be added to each call site. See "What's NOT wired yet" below.

---

## 8. Change history + audit

Every write through `pricingService.js` logs a row to
`pricing_change_history`:

```sql
select created_at, change_type, entity_key, field_name,
       previous_value, new_value
from pricing_change_history
order by created_at desc limit 20;
```

Exposed in the UI at `/dev/pricing/history` with CSV export.

---

## 9. What's NOT wired yet

Things that are built but need a follow-up pass:

1. **Existing AI feature calls wrapping** — the 10+ existing Claude
   API calls in `contract-ai` edge function actions are not yet
   wrapped with `withCredits()`. Until they are, credits are deducted
   only from new code paths that opt in. The infrastructure
   (service, gate component, balance widget, purchase modal) all
   works end-to-end today.
2. **Checkout flow pages** — `/checkout/addon/:key` and
   `/checkout/credits/:key` are referenced from links but not
   implemented as dedicated pages. Clicking a "Purchase" button
   on the addons page currently lands on a link that needs the
   existing `stripe-billing` edge function to handle via its existing
   `create_checkout` action. Minor follow-up.
3. **Visual live preview on the Pricing Page tab** — uses an
   `<iframe src="/pricing">` which works but doesn't reflect unsaved
   edits instantly. Good enough for now.
4. **A/B testing for pricing pages** — out of scope.
5. **Individual plan card customization controls** (badge color picker,
   font picker, etc.) — the schema supports `color_accent`, but the
   UI exposes only text fields. Add a color picker if desired.

---

## 10. Assumptions to verify

1. **Existing `stripe-billing` edge function has a `create_checkout`
   action** — confirmed. Used by the addons/credits checkout links.
2. **`pricing_plans.plan_key` values are consistent** — the seeds use
   `'free'`, `'starter'`, `'pro'`, `'enterprise'`. Don't change these
   — multiple places in the app check `plan_key === 'pro'`.
3. **`profiles.property_id` is the tenant scope** — confirmed.
4. **Base plan prices ($0 / $39 / $199 / Custom) match existing
   customer expectations** — seeds match the old `planLimits.js`
   exactly. No existing customer sees a price change.
5. **`automation_settings.master_automation_enabled` still gates
   existing automations** — untouched. This migration only adds.

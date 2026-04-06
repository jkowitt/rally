# Market Launch Checklist

## 1. Database (30 min)
- [ ] Run all 18 migrations in Supabase SQL editor
- [ ] Verify RLS policies are active on all tables
- [ ] Create developer user account

## 2. Edge Functions (15 min)
```bash
supabase login
supabase link --project-ref juaqategmrghsfkbaiap
supabase functions deploy contract-ai
supabase functions deploy apollo-enrichment
supabase functions deploy hunter-verify
supabase functions deploy send-email
supabase functions deploy stripe-billing
supabase functions deploy claude-valuation
supabase functions deploy daily-intelligence
supabase functions deploy benchmark-updater
supabase functions deploy contact-form
```

## 3. Secrets (5 min)
```bash
# Required
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Optional (activate when ready)
supabase secrets set APOLLO_API_KEY=...
supabase secrets set HUNTER_API_KEY=...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_STARTER_PRICE_ID=price_...
supabase secrets set STRIPE_PRO_PRICE_ID=price_...
supabase secrets set STRIPE_ENTERPRISE_PRICE_ID=price_...
supabase secrets set APP_URL=https://loud-legacy.com
```

## 4. Stripe Setup (30 min)
- [ ] Create Stripe account at stripe.com
- [ ] Create 3 Products: Starter ($49/mo), Pro ($149/mo), Enterprise (custom)
- [ ] Copy Price IDs into secrets above
- [ ] Add webhook endpoint: https://juaqategmrghsfkbaiap.supabase.co/functions/v1/stripe-billing/webhook
- [ ] Select events: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated

## 5. Domain & SSL (15 min)
- [ ] Point loud-legacy.com DNS to Railway
- [ ] Verify SSL certificate active
- [ ] Update canonical URL in index.html if different

## 6. SEO (10 min)
- [ ] Submit sitemap to Google Search Console
- [ ] Verify domain ownership
- [ ] Optional: Submit to Bing Webmaster Tools

## 7. Legal (lawyer needed)
- [ ] Terms of Service finalized
- [ ] Privacy Policy finalized
- [ ] Insert into legal_documents table with current version number

## 8. Monitoring (15 min)
- [ ] Sign up for Sentry (sentry.io) — free tier
- [ ] Add Sentry DSN to environment variables
- [ ] Optional: Add PostHog or Mixpanel for product analytics

## 9. Pre-Launch Testing
- [ ] Register a new account (full signup flow)
- [ ] Create a deal, add contacts, upload a contract
- [ ] Verify fulfillment auto-populates
- [ ] Test mobile experience on iPhone + Android
- [ ] Test newsletter generation
- [ ] Verify search works across all entities
- [ ] Test invite flow (invite a teammate, accept link)

## 10. Launch
- [ ] Announce on LinkedIn
- [ ] Submit to Product Hunt
- [ ] Enable feature flags for all modules
- [ ] Monitor error logs for first 48 hours

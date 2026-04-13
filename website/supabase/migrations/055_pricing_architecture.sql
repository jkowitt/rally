-- ============================================================
-- MIGRATION 055 — PRICING ARCHITECTURE (DB-driven)
-- ============================================================
-- Moves every price, limit, feature flag, credit cost, addon, and
-- pricing-page content string into the database. planLimits.js
-- becomes a thin client that reads from here with a 5-minute cache.
--
-- Base plan prices NEVER change in code:
--   Free $0 / Starter $39/mo / Pro $199/mo / Enterprise custom
-- Existing customers are grandfathered automatically — see the
-- organization_ai_credits + organization_addons tables for per-org
-- overrides.
-- ============================================================

-- ========================
-- 1. PRICING PLANS
-- ========================
create table if not exists pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  display_name text not null,
  tagline text,
  monthly_price_cents integer not null default 0,
  annual_price_cents integer not null default 0,
  annual_savings_text text,
  stripe_monthly_price_id text,
  stripe_annual_price_id text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  cta_text text default 'Start free trial',
  cta_url text default '/login',
  color_accent text default '#E8B84B',
  badge_text text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pricing_plans enable row level security;
create policy "pricing_plans_select" on pricing_plans for select using (true);
create policy "pricing_plans_write" on pricing_plans for all using (is_developer()) with check (is_developer());

-- ========================
-- 2. PLAN LIMITS
-- ========================
create table if not exists plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references pricing_plans(id) on delete cascade,
  limit_key text not null,
  limit_display_name text,
  limit_value integer not null default 0, -- -1 means unlimited
  limit_type text not null default 'hard', -- 'hard' | 'soft'
  reset_period text not null default 'monthly', -- 'monthly' | 'daily' | 'never' | 'per_seat'
  show_on_pricing_page boolean not null default true,
  pricing_page_display text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, limit_key)
);

create index if not exists idx_plan_limits_plan on plan_limits(plan_id);

alter table plan_limits enable row level security;
create policy "plan_limits_select" on plan_limits for select using (true);
create policy "plan_limits_write" on plan_limits for all using (is_developer()) with check (is_developer());

-- ========================
-- 3. PLAN FEATURES (boolean flags)
-- ========================
create table if not exists plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references pricing_plans(id) on delete cascade,
  feature_key text not null,
  feature_display_name text,
  feature_description text,
  is_enabled boolean not null default false,
  show_on_pricing_page boolean not null default true,
  pricing_page_category text default 'Core CRM',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, feature_key)
);

create index if not exists idx_plan_features_plan on plan_features(plan_id);

alter table plan_features enable row level security;
create policy "plan_features_select" on plan_features for select using (true);
create policy "plan_features_write" on plan_features for all using (is_developer()) with check (is_developer());

-- ========================
-- 4. AI CREDIT PACKS (add-on SKUs)
-- ========================
create table if not exists ai_credit_packs (
  id uuid primary key default gen_random_uuid(),
  pack_key text not null unique,
  display_name text not null,
  credit_amount integer not null,
  monthly_price_cents integer not null default 0,
  one_time_price_cents integer not null default 0,
  stripe_price_id text,
  stripe_one_time_price_id text,
  description text,
  best_for_text text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ai_credit_packs enable row level security;
create policy "ai_credit_packs_select" on ai_credit_packs for select using (true);
create policy "ai_credit_packs_write" on ai_credit_packs for all using (is_developer()) with check (is_developer());

-- ========================
-- 5. AI CREDIT COSTS (per feature)
-- ========================
create table if not exists ai_credit_costs (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  feature_display_name text not null,
  credits_per_use integer not null default 1,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ai_credit_costs enable row level security;
-- Authenticated users can read costs (they need to see the price before clicking);
-- only developers can write.
create policy "ai_credit_costs_select" on ai_credit_costs
  for select using (auth.role() = 'authenticated' or is_developer());
create policy "ai_credit_costs_write" on ai_credit_costs
  for all using (is_developer()) with check (is_developer());

-- ========================
-- 6. ORGANIZATION AI CREDITS (per-org balance)
-- ========================
create table if not exists organization_ai_credits (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  plan_credits_remaining integer not null default 0,
  purchased_credits_remaining integer not null default 0,
  total_credits_used_this_period integer not null default 0,
  period_start timestamptz not null default now(),
  period_end timestamptz not null default (now() + interval '1 month'),
  last_reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id)
);

create index if not exists idx_org_credits_property on organization_ai_credits(property_id);

alter table organization_ai_credits enable row level security;
create policy "org_credits_select" on organization_ai_credits
  for select using (is_developer() or property_id = get_user_property_id());
create policy "org_credits_insert" on organization_ai_credits
  for insert with check (is_developer() or property_id = get_user_property_id());
create policy "org_credits_update" on organization_ai_credits
  for update using (is_developer() or property_id = get_user_property_id());

-- ========================
-- 7. AI CREDIT TRANSACTIONS (audit log)
-- ========================
create table if not exists ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  transaction_type text not null, -- 'plan_allocation' | 'purchase' | 'usage' | 'refund' | 'adjustment'
  feature_key text,
  credits_delta integer not null,
  credits_before integer not null default 0,
  credits_after integer not null default 0,
  description text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_tx_property on ai_credit_transactions(property_id, created_at desc);

alter table ai_credit_transactions enable row level security;
create policy "credit_tx_select" on ai_credit_transactions
  for select using (is_developer() or property_id = get_user_property_id());
create policy "credit_tx_insert" on ai_credit_transactions
  for insert with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 8. ADDONS CATALOG
-- ========================
create table if not exists addons (
  id uuid primary key default gen_random_uuid(),
  addon_key text not null unique,
  display_name text not null,
  description text,
  long_description text,
  monthly_price_cents integer not null default 0,
  annual_price_cents integer,
  stripe_monthly_price_id text,
  stripe_annual_price_id text,
  icon text default '✨',
  badge_text text,
  available_for_plans text[] default '{}',
  features_unlocked text[] default '{}',
  limits_increased jsonb default '{}'::jsonb,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table addons enable row level security;
create policy "addons_select" on addons for select using (true);
create policy "addons_write" on addons for all using (is_developer()) with check (is_developer());

-- ========================
-- 9. ORGANIZATION ADDONS (per-org activations)
-- ========================
create table if not exists organization_addons (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  addon_id uuid not null references addons(id) on delete cascade,
  addon_key text not null,
  status text not null default 'active', -- 'active' | 'cancelled' | 'paused'
  billing_period text not null default 'monthly', -- 'monthly' | 'annual'
  stripe_subscription_item_id text,
  activated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancels_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, addon_id)
);

create index if not exists idx_org_addons_property on organization_addons(property_id);

alter table organization_addons enable row level security;
create policy "org_addons_select" on organization_addons
  for select using (is_developer() or property_id = get_user_property_id());
create policy "org_addons_write" on organization_addons
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 10. ORGANIZATION BILLING (monthly/annual period tracking)
-- ========================
create table if not exists organization_billing (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references properties(id) on delete cascade,
  billing_period text not null default 'monthly', -- 'monthly' | 'annual'
  plan_key text not null default 'free',
  monthly_base_price_cents integer not null default 0,
  annual_base_price_cents integer not null default 0,
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  next_invoice_amount_cents integer,
  cancels_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_billing_property on organization_billing(property_id);

alter table organization_billing enable row level security;
create policy "org_billing_select" on organization_billing
  for select using (is_developer() or property_id = get_user_property_id());
create policy "org_billing_write" on organization_billing
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 11. PRICING PAGE CONFIG (content strings)
-- ========================
create table if not exists pricing_page_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  config_value text,
  config_type text not null default 'text', -- 'text' | 'boolean' | 'number' | 'json'
  description text,
  category text default 'general',
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table pricing_page_config enable row level security;
create policy "pricing_config_select" on pricing_page_config for select using (true);
create policy "pricing_config_write" on pricing_page_config
  for all using (is_developer()) with check (is_developer());

-- ========================
-- 12. PRICING PAGE FAQ (separate table for CRUD ordering)
-- ========================
create table if not exists pricing_page_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pricing_page_faqs enable row level security;
create policy "pricing_faqs_select" on pricing_page_faqs for select using (true);
create policy "pricing_faqs_write" on pricing_page_faqs
  for all using (is_developer()) with check (is_developer());

-- ========================
-- 13. PRICING CHANGE HISTORY (audit log)
-- ========================
create table if not exists pricing_change_history (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid references auth.users(id) on delete set null,
  change_type text not null, -- 'plan' | 'limit' | 'feature' | 'credit_cost' | 'credit_pack' | 'addon' | 'page'
  entity_type text,
  entity_key text,
  field_name text,
  previous_value text,
  new_value text,
  change_summary text,
  customers_affected integer default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_pricing_history_created on pricing_change_history(created_at desc);
create index if not exists idx_pricing_history_type on pricing_change_history(change_type);

alter table pricing_change_history enable row level security;
create policy "pricing_history_select" on pricing_change_history
  for select using (is_developer());
create policy "pricing_history_insert" on pricing_change_history
  for insert with check (is_developer());

-- ============================================================
-- SEED DATA — mirrors the current planLimits.js values
-- ============================================================

-- Plans
insert into pricing_plans (plan_key, display_name, tagline, monthly_price_cents, annual_price_cents, annual_savings_text, is_featured, display_order, cta_text, badge_text, description)
values
  ('free', 'Free', 'Perfect for getting started', 0, 0, null, false, 1, 'Start free', null, 'Perfect for getting started'),
  ('starter', 'Starter', 'For growing teams ready to scale', 3900, 39000, '2 months free', false, 2, 'Start free trial', null, 'For growing teams ready to scale'),
  ('pro', 'Pro', 'Full platform for serious operators', 19900, 199000, '2 months free', true, 3, 'Start free trial', 'Most Popular', 'Full platform access for serious operators'),
  ('enterprise', 'Enterprise', 'Unlimited everything plus priority support', 0, 0, null, false, 4, 'Talk to us', null, 'Unlimited everything plus priority support')
on conflict (plan_key) do nothing;

-- Helper function to seed a limit by plan_key
create or replace function seed_limit(p_plan_key text, p_limit_key text, p_display_name text, p_value integer, p_category_text text, p_order integer default 0, p_reset text default 'monthly')
returns void as $$
declare v_plan_id uuid;
begin
  select id into v_plan_id from pricing_plans where plan_key = p_plan_key;
  if v_plan_id is null then return; end if;
  insert into plan_limits (plan_id, limit_key, limit_display_name, limit_value, reset_period, pricing_page_display, display_order)
  values (v_plan_id, p_limit_key, p_display_name, p_value, p_reset,
    case when p_value = -1 then 'Unlimited'
         when p_reset = 'monthly' then p_value::text || '/mo'
         else p_value::text end,
    p_order)
  on conflict (plan_id, limit_key) do nothing;
end;
$$ language plpgsql;

-- Helper to seed features
create or replace function seed_feature(p_plan_key text, p_feature_key text, p_display text, p_enabled boolean, p_category text, p_order integer default 0)
returns void as $$
declare v_plan_id uuid;
begin
  select id into v_plan_id from pricing_plans where plan_key = p_plan_key;
  if v_plan_id is null then return; end if;
  insert into plan_features (plan_id, feature_key, feature_display_name, is_enabled, pricing_page_category, display_order)
  values (v_plan_id, p_feature_key, p_display, p_enabled, p_category, p_order)
  on conflict (plan_id, feature_key) do nothing;
end;
$$ language plpgsql;

-- Seed limits — Free
select seed_limit('free', 'deals', 'Deals', 15, 'Core', 1, 'never');
select seed_limit('free', 'users', 'Team seats', 2, 'Core', 2, 'per_seat');
select seed_limit('free', 'contract_upload', 'Contract parses', 2, 'AI', 3);
select seed_limit('free', 'prospect_search', 'Prospect searches', 3, 'AI', 4);
select seed_limit('free', 'ai_valuation', 'VALORA runs', 0, 'AI', 5);
select seed_limit('free', 'newsletter_generate', 'Newsletters', 1, 'AI', 6);
select seed_limit('free', 'ai_credits_per_month', 'AI credits', 10, 'AI', 7);

-- Seed limits — Starter
select seed_limit('starter', 'deals', 'Deals', 500, 'Core', 1, 'never');
select seed_limit('starter', 'users', 'Team seats', 5, 'Core', 2, 'per_seat');
select seed_limit('starter', 'contract_upload', 'Contract parses', 25, 'AI', 3);
select seed_limit('starter', 'prospect_search', 'Prospect searches', 50, 'AI', 4);
select seed_limit('starter', 'ai_valuation', 'VALORA runs', 25, 'AI', 5);
select seed_limit('starter', 'newsletter_generate', 'Newsletters', 10, 'AI', 6);
select seed_limit('starter', 'ai_credits_per_month', 'AI credits', 100, 'AI', 7);

-- Seed limits — Pro
select seed_limit('pro', 'deals', 'Deals', -1, 'Core', 1, 'never');
select seed_limit('pro', 'users', 'Team seats', 15, 'Core', 2, 'per_seat');
select seed_limit('pro', 'contract_upload', 'Contract parses', -1, 'AI', 3);
select seed_limit('pro', 'prospect_search', 'Prospect searches', 200, 'AI', 4);
select seed_limit('pro', 'ai_valuation', 'VALORA runs', 200, 'AI', 5);
select seed_limit('pro', 'newsletter_generate', 'Newsletters', -1, 'AI', 6);
select seed_limit('pro', 'ai_credits_per_month', 'AI credits', 500, 'AI', 7);

-- Seed limits — Enterprise
select seed_limit('enterprise', 'deals', 'Deals', -1, 'Core', 1, 'never');
select seed_limit('enterprise', 'users', 'Team seats', -1, 'Core', 2, 'per_seat');
select seed_limit('enterprise', 'contract_upload', 'Contract parses', -1, 'AI', 3);
select seed_limit('enterprise', 'prospect_search', 'Prospect searches', -1, 'AI', 4);
select seed_limit('enterprise', 'ai_valuation', 'VALORA runs', -1, 'AI', 5);
select seed_limit('enterprise', 'newsletter_generate', 'Newsletters', -1, 'AI', 6);
select seed_limit('enterprise', 'ai_credits_per_month', 'AI credits', -1, 'AI', 7);

-- Seed features — Free
select seed_feature('free', 'ai_insights', 'AI Deal Insights', false, 'AI Features', 1);
select seed_feature('free', 'fulfillment_reports', 'Fulfillment Reports', false, 'Core CRM', 2);
select seed_feature('free', 'custom_dashboard', 'Custom Dashboards', false, 'Advanced', 3);
select seed_feature('free', 'bulk_import', 'Bulk Import', false, 'Core CRM', 4);
select seed_feature('free', 'csv_export', 'CSV Export', true, 'Core CRM', 5);
select seed_feature('free', 'team_goals', 'Team Goals', false, 'Advanced', 6);
select seed_feature('free', 'advanced_automations', 'Advanced Automations', false, 'Advanced', 7);
select seed_feature('free', 'module_sportify', 'Sportify Events', false, 'Modules', 8);
select seed_feature('free', 'module_valora', 'VALORA Valuations', false, 'Modules', 9);
select seed_feature('free', 'module_businessnow', 'Business Now', false, 'Modules', 10);

-- Seed features — Starter
select seed_feature('starter', 'ai_insights', 'AI Deal Insights', true, 'AI Features', 1);
select seed_feature('starter', 'fulfillment_reports', 'Fulfillment Reports', true, 'Core CRM', 2);
select seed_feature('starter', 'custom_dashboard', 'Custom Dashboards', false, 'Advanced', 3);
select seed_feature('starter', 'bulk_import', 'Bulk Import', true, 'Core CRM', 4);
select seed_feature('starter', 'csv_export', 'CSV Export', true, 'Core CRM', 5);
select seed_feature('starter', 'team_goals', 'Team Goals', true, 'Advanced', 6);
select seed_feature('starter', 'advanced_automations', 'Advanced Automations', false, 'Advanced', 7);
select seed_feature('starter', 'module_sportify', 'Sportify Events', false, 'Modules', 8);
select seed_feature('starter', 'module_valora', 'VALORA Valuations', false, 'Modules', 9);
select seed_feature('starter', 'module_businessnow', 'Business Now', false, 'Modules', 10);

-- Seed features — Pro
select seed_feature('pro', 'ai_insights', 'AI Deal Insights', true, 'AI Features', 1);
select seed_feature('pro', 'fulfillment_reports', 'Fulfillment Reports', true, 'Core CRM', 2);
select seed_feature('pro', 'custom_dashboard', 'Custom Dashboards', true, 'Advanced', 3);
select seed_feature('pro', 'bulk_import', 'Bulk Import', true, 'Core CRM', 4);
select seed_feature('pro', 'csv_export', 'CSV Export', true, 'Core CRM', 5);
select seed_feature('pro', 'team_goals', 'Team Goals', true, 'Advanced', 6);
select seed_feature('pro', 'advanced_automations', 'Advanced Automations', true, 'Advanced', 7);
select seed_feature('pro', 'module_sportify', 'Sportify Events', true, 'Modules', 8);
select seed_feature('pro', 'module_valora', 'VALORA Valuations', true, 'Modules', 9);
select seed_feature('pro', 'module_businessnow', 'Business Now', true, 'Modules', 10);

-- Seed features — Enterprise
select seed_feature('enterprise', 'ai_insights', 'AI Deal Insights', true, 'AI Features', 1);
select seed_feature('enterprise', 'fulfillment_reports', 'Fulfillment Reports', true, 'Core CRM', 2);
select seed_feature('enterprise', 'custom_dashboard', 'Custom Dashboards', true, 'Advanced', 3);
select seed_feature('enterprise', 'bulk_import', 'Bulk Import', true, 'Core CRM', 4);
select seed_feature('enterprise', 'csv_export', 'CSV Export', true, 'Core CRM', 5);
select seed_feature('enterprise', 'team_goals', 'Team Goals', true, 'Advanced', 6);
select seed_feature('enterprise', 'advanced_automations', 'Advanced Automations', true, 'Advanced', 7);
select seed_feature('enterprise', 'module_sportify', 'Sportify Events', true, 'Modules', 8);
select seed_feature('enterprise', 'module_valora', 'VALORA Valuations', true, 'Modules', 9);
select seed_feature('enterprise', 'module_businessnow', 'Business Now', true, 'Modules', 10);
select seed_feature('enterprise', 'white_label', 'White Label', true, 'Advanced', 11);
select seed_feature('enterprise', 'priority_support', 'Priority Support', true, 'Support', 12);
select seed_feature('enterprise', 'api_access', 'API Access', true, 'Advanced', 13);

-- Drop the helpers — they were only needed for seeding
drop function seed_limit(text, text, text, integer, text, integer, text);
drop function seed_feature(text, text, text, boolean, text, integer);

-- AI Credit Packs
insert into ai_credit_packs (pack_key, display_name, credit_amount, monthly_price_cents, one_time_price_cents, description, best_for_text, display_order)
values
  ('credits_100', '100 AI Credits', 100, 1900, 2400, 'Top up when you need more AI power', '~20 contract uploads or 50 deal insight runs', 1),
  ('credits_500', '500 AI Credits', 500, 7900, 9900, 'Most popular top-up for active teams', '~100 contract uploads or 250 deal insight runs', 2),
  ('credits_1000', '1,000 AI Credits', 1000, 13900, 16900, 'Heavy users processing contracts daily', '~200 contract uploads or 500 deal insight runs', 3)
on conflict (pack_key) do nothing;

-- AI Credit Costs
insert into ai_credit_costs (feature_key, feature_display_name, credits_per_use, description)
values
  ('contract_upload', 'Contract Parser', 5, 'PDF → structured benefits via Claude Opus'),
  ('deal_insight', 'Deal Insight', 2, 'AI analysis of a single deal'),
  ('prospect_search', 'Prospect Search', 3, 'AI-powered prospect discovery'),
  ('email_draft', 'Email Draft', 1, 'AI drafts a sponsorship outreach email'),
  ('contact_lookup', 'Contact Lookup', 2, 'Enrich a contact with firmographic data'),
  ('valora_analysis', 'VALORA Analysis', 8, 'Media valuation with AI market comps'),
  ('smart_reply_suggestion', 'Smart Reply', 1, 'Suggested replies in Conversations'),
  ('newsletter_generate', 'Newsletter Generate', 10, 'AI-generated newsletter draft'),
  ('forecast_run', 'Pipeline Forecast', 2, 'AI pipeline forecast run'),
  ('prospect_suggest', 'Prospect Suggestions', 3, 'AI suggests next-best prospects')
on conflict (feature_key) do nothing;

-- Addons
insert into addons (addon_key, display_name, description, long_description, monthly_price_cents, icon, available_for_plans, features_unlocked, limits_increased, display_order)
values
  ('valora_premium', 'VALORA Premium', 'Full AI media valuation, broadcast analysis, CPP modeling',
   'Unlocks the complete VALORA valuation engine for Starter plans — broadcast analysis, CPP modeling, market-comp pricing, and AI-powered negotiation insights. Comes standard on Pro and Enterprise.',
   4900, '📊', array['starter'], array['module_valora'], '{}'::jsonb, 1),

  ('advanced_analytics', 'Advanced Analytics', 'Custom dashboards, cross-deal reporting, trend analysis',
   'Custom dashboard builder, cross-deal rollups, trend analysis, cohort reporting, and executive summary exports.',
   2900, '📈', array['starter','pro'], array['custom_dashboard'], '{}'::jsonb, 2),

  ('white_label', 'White Label', 'Your branding on the platform for agency clients',
   'Replace Loud Legacy branding with your own. Custom domain, custom logo, custom accent colors, white-labeled client portals.',
   9900, '🏷️', array['pro'], array['white_label'], '{}'::jsonb, 3),

  ('api_access', 'API Access', 'Direct API for custom integrations and automations',
   'Full REST API access for custom integrations, Zapier, and automation pipelines. Includes API keys, rate limits, and developer docs.',
   4900, '🔌', array['starter','pro'], array['api_access'], '{}'::jsonb, 4),

  ('extra_users_5', '5 Extra Users', 'Add 5 more team members beyond your plan limit',
   'Add 5 additional team seats to your current plan without upgrading.',
   2900, '👥', array['starter','pro'], '{}', '{"users": 5}'::jsonb, 5),

  ('extra_users_10', '10 Extra Users', 'Add 10 more team members beyond your plan limit',
   'Add 10 additional team seats to your current plan without upgrading.',
   4900, '👥', array['starter','pro'], '{}', '{"users": 10}'::jsonb, 6),

  ('additional_property', 'Additional Property', 'Manage an additional sports org or venue on one account',
   'Add a completely separate property (second team, second venue, second agency client) to your Pro account.',
   3900, '🏢', array['pro'], '{}', '{"properties": 1}'::jsonb, 7)
on conflict (addon_key) do nothing;

-- Pricing page config
insert into pricing_page_config (config_key, config_value, config_type, description, category, display_order)
values
  ('hero_headline', 'Simple, Transparent Pricing', 'text', 'Main H1', 'hero', 1),
  ('hero_subheadline', 'The sponsorship CRM your competitors pay $15,000 a year for. Starting at $39 a month.', 'text', 'Subtitle under H1', 'hero', 2),
  ('comparison_callout', 'Legacy enterprise sponsorship CRMs charge $15,000+/year. Loud Legacy Pro is $199/month. Same category. 18 AI features they don''t have. 1/10th the price.', 'text', 'Callout box text', 'hero', 3),
  ('annual_billing_banner', 'Save 2 months with annual billing', 'text', 'Banner above toggle', 'hero', 4),
  ('comparison_callout_enabled', 'true', 'boolean', 'Show comparison callout box', 'sections', 1),
  ('faq_enabled', 'true', 'boolean', 'Show FAQ section', 'sections', 2),
  ('comparison_table_enabled', 'true', 'boolean', 'Show feature comparison table', 'sections', 3),
  ('addon_section_enabled', 'true', 'boolean', 'Show addons showcase', 'sections', 4),
  ('credit_section_enabled', 'true', 'boolean', 'Show AI credits explainer', 'sections', 5),
  ('testimonial_section_enabled', 'false', 'boolean', 'Show testimonials', 'sections', 6),
  ('enterprise_cta_enabled', 'true', 'boolean', 'Show enterprise CTA section', 'sections', 7),
  ('enterprise_cta_text', 'Talk to us about Enterprise', 'text', 'Enterprise button text', 'content', 1),
  ('enterprise_cta_subtext', 'Custom pricing for large organizations, agencies, and multi-property groups. White label and API access included.', 'text', 'Enterprise description', 'content', 2)
on conflict (config_key) do nothing;

-- FAQs
insert into pricing_page_faqs (question, answer, display_order)
values
  ('Why is Loud Legacy so much cheaper than legacy sponsorship CRMs?',
   'Legacy sponsorship CRMs were built for an era before AI automation made it possible to dramatically reduce the cost of sophisticated software. We built Loud Legacy from the ground up with AI at the core, which means we can deliver more features at a fraction of the cost.',
   1),
  ('What are AI credits?',
   'AI credits power the AI features in Loud Legacy — contract parsing, deal insights, prospect discovery, email drafting, and more. Every plan includes monthly credits. Heavy users can purchase additional credit packs that never expire.',
   2),
  ('Can I change plans anytime?',
   'Yes. Upgrade instantly. Downgrade at the end of your billing period. No lock-in contracts.',
   3),
  ('What happens to my data if I cancel?',
   'Your data is yours. We provide a full CSV export of all your deals, contacts, contracts, and assets before cancellation. We retain your data for 30 days after cancellation in case you change your mind.',
   4),
  ('Do you offer annual billing?',
   'Yes — and it saves you the equivalent of 2 months. Starter annual is $390/year ($32.50/month). Pro annual is $1,990/year ($165.83/month).',
   5),
  ('What is the Enterprise plan?',
   'Enterprise includes unlimited everything, white label, API access, dedicated support, and custom integrations. Pricing is based on organization size and needs. Contact us to discuss.',
   6)
on conflict do nothing;

-- Backfill organization_ai_credits for every existing property
insert into organization_ai_credits (property_id, plan_credits_remaining, period_start, period_end)
select p.id, 100, now(), now() + interval '1 month'
from properties p
on conflict (property_id) do nothing;

-- Backfill organization_billing from existing profiles (best-effort)
-- Uses profile.role → plan mapping where possible, otherwise defaults to free
insert into organization_billing (property_id, billing_period, plan_key, monthly_base_price_cents, annual_base_price_cents)
select
  p.id,
  'monthly',
  'free',
  0,
  0
from properties p
on conflict (property_id) do nothing;

-- ============================================================
-- DONE
-- ============================================================

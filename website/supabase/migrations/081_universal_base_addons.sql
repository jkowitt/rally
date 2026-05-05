-- ============================================================
-- MIGRATION 081 — UNIVERSAL BASE + ADD-ON CATALOG
-- ============================================================
-- Sign-up no longer asks for industry. Every property gets the
-- same CRM + Prospecting + Account Management surface. Specialty
-- features become add-ons priced via Contact-Sales conversations.
--
-- This migration:
--   1. Creates addon_catalog (the canonical list, seeded here)
--   2. Creates property_addons (which add-ons are active per property)
--   3. Creates addon_requests (sales-contact submissions)
--   4. Adds a property_active_addons view for cheap lookup
--   5. Backfills every existing property with the "core" baseline
--      so nothing they currently use disappears
--   6. Leaves properties.type intact for backwards compat — code
--      stops *reading* it but nothing legacy breaks
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ADD-ON CATALOG
-- ────────────────────────────────────────────────────────────
create table if not exists addon_catalog (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,                    -- 'phone_calls', 'public_api', etc.
  name text not null,
  short_description text not null,
  long_description text,
  category text not null default 'features',   -- 'features' | 'integrations' | 'service' | 'compliance'
  icon text,
  price_hint text,                             -- 'Contact sales' | 'Starts at $X/mo'
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table addon_catalog enable row level security;
create policy "addon_catalog_read_all" on addon_catalog for select using (true);
create policy "addon_catalog_dev_write" on addon_catalog for all using (is_developer());

-- Seed the catalog. Anyone can edit later via an admin panel.
insert into addon_catalog (key, name, short_description, long_description, category, icon, price_hint, position) values
  ('phone_calls', 'Phone & Calls',
    'Twilio click-to-call with auto-transcription + AI summaries.',
    'Place outbound calls from any contact card. Recordings transcribed via Whisper, summarized + sentiment-tagged via Claude. Auto-logs to the deal timeline.',
    'integrations', '📞', 'Contact sales', 1),
  ('public_api', 'Public API & Zapier',
    'REST endpoints for deals, contacts, sequences, signals — Zapier-ready.',
    'X-Rally-API-Key auth. GET/POST on every core resource. Outbound webhooks with HMAC signing for every event type. Drop into Zapier, Make, or your own infra.',
    'integrations', '🔌', 'Contact sales', 2),
  ('funding_radar', 'Funding & Earnings Radar',
    'SEC EDGAR + funding-round signals on tracked accounts.',
    'Daily scans of public-company filings for partnership/sponsorship mentions. Crunchbase-class funding events flagged on every brand in your pipeline. Champion-track + auto-enroll into a "congrats" cadence.',
    'features', '📡', 'Contact sales', 3),
  ('personality_profiles', 'Personality Profiles',
    'Crystal-style buyer profiles with tone hints in Compose.',
    'AI reads each contact''s public signals and renders a one-line tone hint inline in Compose: DISC type, communication style, decision drivers, phrases to avoid.',
    'features', '🧠', 'Contact sales', 4),
  ('daily_digests', 'Daily Slack & Email Digests',
    '8am push of priority queue + active signals + nudges.',
    'Subscribe per user. Email via Resend or Slack via incoming webhook. Block-Kit formatted with action buttons that jump to the right page.',
    'features', '📨', 'Contact sales', 5),
  ('ab_sequences', 'A/B Sequence Testing',
    'Per-step variants with statistical winner-crowning.',
    'Round-robin variants while warming up; once ≥30 sends per variant, system crowns the highest reply-rate variant and sticks with it. Per-variant performance view.',
    'features', '🧪', 'Contact sales', 6),
  ('activations', 'Activations Module',
    'Event management + attendee tracking + activation reports.',
    'Plan, run, and recap activations and events tied to sponsorship deals. Attendee imports, on-site fulfillment, post-event recap deck.',
    'features', '🎟', 'Contact sales', 7),
  ('valora', 'VALORA Valuation Engine',
    'Asset-by-asset sponsorship valuation with market benchmarks.',
    'Plug in audience, broadcast minutes, screen-share, clarity, CPP — get a defensible valuation per asset. Benchmarks update monthly.',
    'features', '💰', 'Contact sales', 8),
  ('businessnow', 'Business Now Intelligence',
    'Industry market intelligence + executive briefings.',
    'Curated weekly briefs on category trends, deal news, and competitive moves. Targeted at executives running the property.',
    'features', '📊', 'Contact sales', 9),
  ('email_marketing', 'Newsletter & Email Marketing',
    'Bulk outbound campaigns, segmentation, suppression lists.',
    'Beyond 1:1 sequences — full marketing email infra: campaigns, segments, A/B subjects, deliverability monitoring, CAN-SPAM/GDPR-compliant.',
    'integrations', '📰', 'Contact sales', 10),
  ('white_label_portal', 'Custom-Branded Sponsor Portal',
    'Match your property''s brand on the sponsor-facing portal.',
    'Custom domain (yourbrand.com/sponsor/...), custom logo + colors, optional remove-Loud-Legacy footer.',
    'features', '🎨', 'Contact sales', 11),
  ('premium_ai', 'Premium AI',
    'Unlimited account briefs, lookalikes, and AI drafts.',
    'Lifts the rate limits on every Claude-powered surface. Useful at scale (50+ deals or 500+ contacts active).',
    'features', '✨', 'Contact sales', 12),
  ('dedicated_csm', 'Dedicated Success Manager',
    'Human-led onboarding, QBR support, and adoption coaching.',
    'A named contact at Loud Legacy who runs your kickoff, attends your first 3 QBRs, and coaches your team on adoption.',
    'service', '🤝', 'Contact sales', 13),
  ('premium_support', '24/7 Premium Support',
    'SLA-backed support with named contacts.',
    '<2-hour first-response SLA. Critical issues 24/7. Direct Slack channel with our team.',
    'service', '🛟', 'Contact sales', 14),
  ('soc2_compliance', 'SOC 2 + Audit Pack',
    'Compliance reports + custom audit trail exports.',
    'Quarterly SOC 2 Type II report. Custom audit trail exports on request. Vendor questionnaire support.',
    'compliance', '🛡', 'Contact sales', 15),
  ('multi_property', 'Multi-Property / Agency Mode',
    'Manage multiple properties from one account with rollups.',
    'For agencies repping multiple brands or holding companies running multiple venues. Cross-property pipeline + commission tracking.',
    'features', '🏢', 'Contact sales', 16)
on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────
-- 2. PROPERTY_ADDONS — what's enabled per property
-- ────────────────────────────────────────────────────────────
create table if not exists property_addons (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  addon_key text not null references addon_catalog(key) on delete cascade,
  enabled_at timestamptz not null default now(),
  enabled_by uuid references profiles(id) on delete set null,
  expires_at timestamptz,                      -- null = no expiry
  notes text,
  unique(property_id, addon_key)
);

create index if not exists idx_property_addons_property on property_addons(property_id);
-- Partial-index predicates can't reference now() because it's STABLE,
-- not IMMUTABLE. The runtime "is this addon active?" check happens in
-- the queries below — the index just covers (property_id, addon_key)
-- with expires_at as a payload for cheap filtering at scan time.
create index if not exists idx_property_addons_active on property_addons(property_id, addon_key, expires_at);

alter table property_addons enable row level security;
create policy "property_addons_property_read" on property_addons for select using (
  property_id = get_user_property_id() or is_developer()
);
create policy "property_addons_dev_write" on property_addons for all using (is_developer());

-- Cheap lookup view for `useAddons` in the app — only currently-active rows.
create or replace view property_active_addons as
  select pa.property_id, pa.addon_key, ac.name, ac.category
  from property_addons pa
  join addon_catalog ac on ac.key = pa.addon_key
  where ac.is_active = true
    and (pa.expires_at is null or pa.expires_at > now());

-- ────────────────────────────────────────────────────────────
-- 3. ADDON_REQUESTS — sales-contact submissions
-- ────────────────────────────────────────────────────────────
create table if not exists addon_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  addon_key text not null references addon_catalog(key) on delete cascade,
  requested_by uuid references profiles(id) on delete set null,
  contact_email text not null,
  contact_name text,
  message text,
  status text not null default 'pending',     -- 'pending' | 'contacted' | 'approved' | 'declined' | 'cancelled'
  status_notes text,
  status_changed_at timestamptz,
  status_changed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_addon_requests_property on addon_requests(property_id, status, created_at desc);
create index if not exists idx_addon_requests_pending on addon_requests(status, created_at) where status = 'pending';

alter table addon_requests enable row level security;
-- Property members can read + create their own requests
create policy "addon_requests_property_read" on addon_requests for select using (
  property_id = get_user_property_id() or is_developer()
);
create policy "addon_requests_property_insert" on addon_requests for insert with check (
  property_id = get_user_property_id()
);
-- Only developers can change status / approve
create policy "addon_requests_dev_update" on addon_requests for update using (is_developer());

-- Notification: when a request is created, ping every developer.
create or replace function notify_devs_on_addon_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_addon_name text;
  v_property_name text;
  uid uuid;
begin
  select name into v_addon_name from addon_catalog where key = new.addon_key;
  select name into v_property_name from properties where id = new.property_id;

  for uid in select id from profiles where role = 'developer' loop
    insert into user_notifications (user_id, type, title, body, link, icon, metadata)
      values (
        uid, 'addon_request',
        'Add-on request: ' || coalesce(v_addon_name, new.addon_key),
        coalesce(v_property_name, 'A property') || ' wants ' || coalesce(v_addon_name, new.addon_key) ||
          coalesce(' — "' || left(new.message, 200) || '"', ''),
        '/app/admin/addons',
        '🛒',
        jsonb_build_object('request_id', new.id, 'property_id', new.property_id, 'addon_key', new.addon_key)
      );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_devs_addon_request on addon_requests;
create trigger trg_notify_devs_addon_request
  after insert on addon_requests
  for each row execute function notify_devs_on_addon_request();

-- When the request transitions to 'approved', flip the property_addons
-- row + notify the requester. ('contacted' / 'declined' just update status.)
create or replace function fulfill_addon_request_on_approve() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_addon_name text;
begin
  if old.status = new.status then return new; end if;
  if new.status <> 'approved' then return new; end if;

  insert into property_addons (property_id, addon_key, enabled_by, notes)
    values (new.property_id, new.addon_key, new.status_changed_by, new.status_notes)
    on conflict (property_id, addon_key) do update set
      enabled_by = excluded.enabled_by,
      enabled_at = now(),
      expires_at = null,
      notes = excluded.notes;

  select name into v_addon_name from addon_catalog where key = new.addon_key;
  if new.requested_by is not null then
    insert into user_notifications (user_id, type, title, body, link, icon, metadata)
      values (
        new.requested_by, 'addon_approved',
        coalesce(v_addon_name, new.addon_key) || ' is now active',
        'The add-on you requested has been turned on for your property.',
        '/app/settings',
        '✨',
        jsonb_build_object('addon_key', new.addon_key)
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fulfill_addon_request on addon_requests;
create trigger trg_fulfill_addon_request
  after update of status on addon_requests
  for each row execute function fulfill_addon_request_on_approve();

-- ────────────────────────────────────────────────────────────
-- 4. BACKFILL — preserve every existing property's current access
-- ────────────────────────────────────────────────────────────
-- Read existing feature_flags rows for module names that map to
-- add-ons. If a property has a flag enabled today, give them the
-- corresponding add-on so they don't lose anything on day 1.
do $$
declare
  -- Map historic feature_flags module → addon_catalog key
  v_map jsonb := jsonb_build_object(
    'phone_integration', 'phone_calls',
    'public_api', 'public_api',
    'funding_radar', 'funding_radar',
    'sec_edgar_radar', 'funding_radar',
    'personality_profiles', 'personality_profiles',
    'daily_digests', 'daily_digests',
    'ab_testing', 'ab_sequences',
    'sportify', 'activations',
    'valora', 'valora',
    'businessnow', 'businessnow',
    'email_marketing_public', 'email_marketing'
  );
  v_module text;
  v_addon text;
begin
  for v_module in select jsonb_object_keys(v_map) loop
    v_addon := v_map ->> v_module;
    -- Every property that currently has this flag enabled gets the addon.
    insert into property_addons (property_id, addon_key, enabled_at, notes)
    select p.id, v_addon, now(), 'Backfill from feature_flags.' || v_module
      from properties p
      cross join feature_flags ff
      where ff.module = v_module
        and ff.enabled = true
    on conflict (property_id, addon_key) do nothing;
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────
-- 5. ROUTING — properties.type kept but no longer required
-- ────────────────────────────────────────────────────────────
-- We don't drop the column (existing rows + integrations still
-- reference it). New properties default to null, and every
-- consuming hook will treat null as "universal".
alter table properties alter column type drop not null;

-- Convenience: default every new property to opt-in to nothing.
-- (Existing accounts already backfilled above.)

-- ────────────────────────────────────────────────────────────
-- 6. FEATURE FLAGS HOUSEKEEPING
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('addon_catalog', true),
  ('contact_sales_flow', true)
on conflict (module) do nothing;

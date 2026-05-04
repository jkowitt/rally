-- ============================================================
-- MIGRATION 074 — PROSPECT INTELLIGENCE LAYER
-- ============================================================
-- The "Sales Nav, but better" moat:
--   1. Account ownership — assign a team member as the lead for a deal
--   2. Buying committee — multi-stakeholder map per deal with role + influence
--   3. Prospect signals — job changes, hiring, sponsorships, earnings, ad-spend
--   4. Reply intent classifications — interested / objection / oof / unsub
--   5. Lookalikes — Claude-suggested matches from a seed deal
--   6. Warm-path relationships — manual + inbox-mined intros
--   7. Multi-channel sequence steps — email | linkedin_dm | phone | task
--   8. ICP cluster cache — output of "reverse ICP from closed-won"
--   9. Lead-conflict detection — flag when two reps target the same brand
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ACCOUNT LEAD ASSIGNMENT
-- ────────────────────────────────────────────────────────────
-- Adds a first-class account owner on each deal. Defaults null
-- so existing rows aren't disturbed.
alter table deals add column if not exists account_lead_id uuid references profiles(id) on delete set null;
create index if not exists idx_deals_account_lead on deals(account_lead_id);

-- last_enriched_at on contacts powers signal-radar's stalest-first
-- scan. Contacts without one are treated as oldest.
alter table contacts add column if not exists last_enriched_at timestamptz;
create index if not exists idx_contacts_last_enriched on contacts(last_enriched_at nulls first);

-- ────────────────────────────────────────────────────────────
-- 2. BUYING COMMITTEE
-- ────────────────────────────────────────────────────────────
-- Per-deal committee map. A contact can appear in multiple deals
-- with different roles / influence. parent_contact_id encodes
-- reporting lines so the org chart can render a tree.
create table if not exists deal_committee (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  role text not null,                        -- 'decision_maker' | 'champion' | 'blocker' | 'end_user' | 'finance' | 'agency' | 'influencer' | 'gatekeeper'
  influence_score integer check (influence_score between 1 and 10),
  tenure_months integer,                     -- months in current role
  parent_contact_id uuid references contacts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(deal_id, contact_id)
);

create index if not exists idx_deal_committee_deal on deal_committee(deal_id);
create index if not exists idx_deal_committee_property on deal_committee(property_id);
create index if not exists idx_deal_committee_contact on deal_committee(contact_id);

alter table deal_committee enable row level security;
create policy "deal_committee_property_all" on deal_committee for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 3. PROSPECT SIGNALS
-- ────────────────────────────────────────────────────────────
-- Universal signal feed. signal_type defines the schema of payload.
-- Designed to scale without schema changes.
create table if not exists prospect_signals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  signal_type text not null,                 -- 'job_change' | 'hiring_post' | 'competitor_sponsorship' | 'earnings_mention' | 'ad_spend_delta' | 'engagement_burst' | 'website_visit'
  severity text not null default 'medium',   -- 'high' | 'medium' | 'low'
  title text not null,
  description text,
  source text,                               -- 'apollo' | 'claude' | 'manual' | 'sponsorunited' | 'inbox'
  source_url text,
  surfaced_at timestamptz not null default now(),
  dismissed_at timestamptz,
  acted_on_at timestamptz,
  acted_on_by uuid references profiles(id) on delete set null,
  payload jsonb default '{}'::jsonb
);

create index if not exists idx_prospect_signals_property on prospect_signals(property_id, surfaced_at desc);
create index if not exists idx_prospect_signals_contact on prospect_signals(contact_id);
create index if not exists idx_prospect_signals_deal on prospect_signals(deal_id);
create index if not exists idx_prospect_signals_active on prospect_signals(property_id, surfaced_at desc)
  where dismissed_at is null and acted_on_at is null;

alter table prospect_signals enable row level security;
create policy "prospect_signals_property_all" on prospect_signals for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 4. REPLY INTENT CLASSIFICATIONS
-- ────────────────────────────────────────────────────────────
-- One row per inbound message after the classifier runs. Tagged
-- onto outreach_log via outreach_log_id for inbound rows.
create table if not exists reply_intent_classifications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  outreach_log_id uuid references outreach_log(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  intent text not null,                       -- 'interested' | 'objection' | 'meeting_request' | 'unsubscribe' | 'out_of_office' | 'wrong_person' | 'not_now' | 'closed_lost' | 'unclear'
  confidence numeric(3,2),                    -- 0.00 - 1.00
  rationale text,
  suggested_action text,                      -- 'reply_now' | 'route_to_owner' | 'pause_sequence' | 'mark_lost' | 'snooze_30d' | 'remove_from_lists'
  classified_at timestamptz not null default now(),
  classifier_version text default 'v1'
);

create index if not exists idx_reply_intent_property on reply_intent_classifications(property_id, classified_at desc);
create index if not exists idx_reply_intent_outreach on reply_intent_classifications(outreach_log_id);
create index if not exists idx_reply_intent_intent on reply_intent_classifications(property_id, intent);

alter table reply_intent_classifications enable row level security;
create policy "reply_intent_property_all" on reply_intent_classifications for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 5. LOOKALIKES + ICP CLUSTERS
-- ────────────────────────────────────────────────────────────
-- prospect_lookalikes: Claude-suggested matches from a seed deal
-- or from the property's closed-won cluster. status drives the UI:
-- 'pending' shows in feed; 'dismissed' hides; 'added' creates a deal.
create table if not exists prospect_lookalikes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  seed_deal_id uuid references deals(id) on delete set null,
  seed_kind text not null default 'deal',    -- 'deal' | 'icp_cluster'
  candidate_company text not null,
  candidate_industry text,
  candidate_website text,
  candidate_linkedin text,
  candidate_city text,
  candidate_state text,
  similarity_score numeric(3,2),             -- 0.00-1.00
  rationale text,
  status text not null default 'pending',    -- 'pending' | 'dismissed' | 'added'
  surfaced_at timestamptz not null default now(),
  acted_at timestamptz,
  acted_by uuid references profiles(id) on delete set null,
  payload jsonb default '{}'::jsonb
);

create index if not exists idx_lookalikes_property on prospect_lookalikes(property_id, surfaced_at desc);
create index if not exists idx_lookalikes_seed on prospect_lookalikes(seed_deal_id);
create index if not exists idx_lookalikes_pending on prospect_lookalikes(property_id) where status = 'pending';

alter table prospect_lookalikes enable row level security;
create policy "lookalikes_property_all" on prospect_lookalikes for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ICP cluster cache — output of "analyze our closed-won deals
-- and tell us our ideal customer profile". One per property,
-- regenerated by the user on demand.
create table if not exists icp_clusters (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  generated_at timestamptz not null default now(),
  generated_by uuid references profiles(id) on delete set null,
  win_count integer not null default 0,
  cluster_summary text,
  cluster_industries text[] default '{}',
  cluster_size_band text,
  cluster_geography text[] default '{}',
  cluster_traits jsonb default '{}'::jsonb,
  is_current boolean not null default true
);

create index if not exists idx_icp_clusters_current on icp_clusters(property_id, is_current);

alter table icp_clusters enable row level security;
create policy "icp_clusters_property_all" on icp_clusters for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 6. WARM-PATH RELATIONSHIPS
-- ────────────────────────────────────────────────────────────
-- Edges in the "team's collective network" graph. owner_user_id is
-- the team member who knows the contact; strength is 1-10. Sources:
-- 'manual' (self-reported), 'inbox' (derived from mail-thread cadence),
-- 'linkedin' (future), 'meeting' (calendar import).
create table if not exists warm_path_relationships (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  owner_user_id uuid not null references profiles(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  relationship_type text not null,           -- 'former_colleague' | 'school' | 'introduced_by' | 'industry_peer' | 'family' | 'frequent_correspondent'
  strength integer check (strength between 1 and 10),
  notes text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique(owner_user_id, contact_id, relationship_type)
);

create index if not exists idx_warm_path_property on warm_path_relationships(property_id);
create index if not exists idx_warm_path_owner on warm_path_relationships(owner_user_id);
create index if not exists idx_warm_path_contact on warm_path_relationships(contact_id);

alter table warm_path_relationships enable row level security;
create policy "warm_path_property_all" on warm_path_relationships for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 7. MULTI-CHANNEL SEQUENCE STEPS
-- ────────────────────────────────────────────────────────────
-- Add channel + task descriptor columns to prospect_sequence_steps
-- so a step can be "email", "linkedin DM template", "phone task",
-- or "engage on their post".
alter table prospect_sequence_steps add column if not exists channel text not null default 'email'; -- 'email' | 'linkedin_dm' | 'phone' | 'task' | 'engage_post'
alter table prospect_sequence_steps add column if not exists task_template text; -- for non-email channels
alter table prospect_sequence_steps add column if not exists name text;          -- short label e.g. "Day 3: LinkedIn nudge"

-- prospect_sequence_tasks: when a non-email step fires, the runner
-- creates a task row instead of sending mail. The rep clears it
-- after they do the action.
create table if not exists prospect_sequence_tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  enrollment_id uuid not null references prospect_sequence_enrollments(id) on delete cascade,
  step_index integer not null,
  channel text not null,
  contact_id uuid references contacts(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  due_at timestamptz not null,
  task_text text,
  completed_at timestamptz,
  completed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sequence_tasks_open on prospect_sequence_tasks(property_id, completed_at, due_at)
  where completed_at is null;
create index if not exists idx_sequence_tasks_assigned on prospect_sequence_tasks(assigned_to, completed_at, due_at);

alter table prospect_sequence_tasks enable row level security;
create policy "sequence_tasks_property_all" on prospect_sequence_tasks for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 8. LEAD CONFLICT DETECTION
-- ────────────────────────────────────────────────────────────
-- View showing where two property members have open deals against
-- the same brand_name. RLS scopes naturally via the deals policy.
create or replace view deal_conflicts as
  select
    a.property_id,
    a.brand_name,
    a.id as deal_a_id,
    a.account_lead_id as lead_a,
    b.id as deal_b_id,
    b.account_lead_id as lead_b,
    a.created_at as deal_a_at,
    b.created_at as deal_b_at
  from deals a
  join deals b on b.property_id = a.property_id
              and lower(b.brand_name) = lower(a.brand_name)
              and b.id < a.id
              and b.stage not in ('Renewed', 'Declined')
              and a.stage not in ('Renewed', 'Declined');

comment on view deal_conflicts is
  'Two-or-more open deals targeting the same brand inside the same property — flag for owner deconfliction.';

-- ────────────────────────────────────────────────────────────
-- 9. ENGAGEMENT-BASED PRIORITY VIEW
-- ────────────────────────────────────────────────────────────
-- Materializes "who to call today": ranks contacts by recent
-- opens, clicks, replies, and stage. Recomputed on read; cheap
-- because outreach_log is indexed.
create or replace view contact_engagement_score as
  select
    c.id as contact_id,
    c.property_id,
    c.deal_id,
    c.email,
    c.first_name,
    c.last_name,
    c.company,
    c.last_email_sent_at,
    c.last_email_received_at,
    c.outreach_count,
    c.response_count,
    coalesce((select count(*) from outreach_log ol
              where ol.contact_id = c.id
                and ol.opened_at is not null
                and ol.opened_at > now() - interval '14 days'), 0) as opens_14d,
    coalesce((select count(*) from outreach_log ol
              where ol.contact_id = c.id
                and ol.clicked_at is not null
                and ol.clicked_at > now() - interval '14 days'), 0) as clicks_14d,
    coalesce((select count(*) from outreach_log ol
              where ol.contact_id = c.id
                and ol.replied_at is not null
                and ol.replied_at > now() - interval '14 days'), 0) as replies_14d,
    -- Composite priority score. Tweakable later; for v1 a simple sum.
    (
      coalesce((select count(*) from outreach_log ol
                where ol.contact_id = c.id
                  and ol.opened_at is not null
                  and ol.opened_at > now() - interval '14 days'), 0) * 2
    + coalesce((select count(*) from outreach_log ol
                where ol.contact_id = c.id
                  and ol.clicked_at is not null
                  and ol.clicked_at > now() - interval '14 days'), 0) * 5
    + coalesce((select count(*) from outreach_log ol
                where ol.contact_id = c.id
                  and ol.replied_at is not null
                  and ol.replied_at > now() - interval '14 days'), 0) * 10
    ) as priority_score
  from contacts c;

comment on view contact_engagement_score is
  'Per-contact engagement signals + composite priority score for the daily call queue.';

-- ────────────────────────────────────────────────────────────
-- 10. ACCOUNT-RELATIONSHIP HISTORY SEARCH HELPER
-- ────────────────────────────────────────────────────────────
-- "Has anyone on the team ever talked to <brand>?" — single RPC
-- that checks contacts, outreach_log, and activities for the brand
-- across all deals in the property.
create or replace function search_brand_history(p_property_id uuid, p_brand_name text)
returns table (
  source text,
  hit_count bigint,
  earliest_at timestamptz,
  latest_at timestamptz,
  details jsonb
)
language sql security invoker stable as $$
  select 'contacts' as source,
         count(*) as hit_count,
         min(c.created_at) as earliest_at,
         max(coalesce(c.last_contacted_at, c.created_at)) as latest_at,
         jsonb_agg(jsonb_build_object(
           'id', c.id, 'name', c.first_name || ' ' || coalesce(c.last_name,''),
           'email', c.email, 'company', c.company
         )) as details
    from contacts c
   where c.property_id = p_property_id
     and (lower(c.company) like '%' || lower(p_brand_name) || '%'
          or lower(c.email) like '%' || lower(p_brand_name) || '%')
  having count(*) > 0
  union all
  select 'outreach_log',
         count(*),
         min(ol.sent_at),
         max(ol.sent_at),
         jsonb_agg(jsonb_build_object(
           'id', ol.id, 'subject', ol.subject,
           'direction', ol.direction, 'to_email', ol.to_email,
           'sent_at', ol.sent_at
         ) order by ol.sent_at desc)
    from outreach_log ol
   where ol.property_id = p_property_id
     and (lower(coalesce(ol.subject,'')) like '%' || lower(p_brand_name) || '%'
          or lower(coalesce(ol.to_email,'')) like '%' || lower(p_brand_name) || '%')
  having count(*) > 0
  union all
  select 'deals',
         count(*),
         min(d.created_at),
         max(d.created_at),
         jsonb_agg(jsonb_build_object(
           'id', d.id, 'brand_name', d.brand_name, 'stage', d.stage,
           'account_lead_id', d.account_lead_id, 'value', d.value
         ))
    from deals d
   where d.property_id = p_property_id
     and lower(d.brand_name) like '%' || lower(p_brand_name) || '%'
  having count(*) > 0;
$$;

grant execute on function search_brand_history(uuid, text) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 11. FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('signal_radar', false),
  ('reply_intent_classifier', false),
  ('lookalike_finder', false),
  ('icp_clusters', false),
  ('warm_path_finder', false),
  ('multi_channel_sequences', false),
  ('priority_queue', false),
  ('account_lead_assignment', false),
  ('buying_committee', false),
  ('lead_conflict_detection', false)
on conflict (module) do nothing;

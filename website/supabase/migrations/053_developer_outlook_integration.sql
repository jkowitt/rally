-- ============================================================
-- MIGRATION 053 — DEVELOPER-ONLY OUTLOOK INTEGRATION
-- ============================================================
-- Private to the developer role. Every table, policy, and flag
-- in this migration is gated to is_developer() = true.
-- No other role may read, write, or even see these objects exist.
-- ============================================================

-- ========================
-- 1. OUTLOOK OAUTH TOKENS
-- ========================
create table if not exists outlook_auth (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text,           -- encrypted at app layer (see encryptToken in service)
  refresh_token text,          -- encrypted at app layer
  token_expires_at timestamptz,
  outlook_email text,
  outlook_display_name text,
  is_connected boolean not null default false,
  connected_at timestamptz,
  last_synced_at timestamptz,
  last_delta_link text,        -- for Microsoft Graph delta queries
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table outlook_auth enable row level security;

create policy "outlook_auth_dev_select" on outlook_auth
  for select using (is_developer());
create policy "outlook_auth_dev_insert" on outlook_auth
  for insert with check (is_developer());
create policy "outlook_auth_dev_update" on outlook_auth
  for update using (is_developer());
create policy "outlook_auth_dev_delete" on outlook_auth
  for delete using (is_developer());

-- ========================
-- 2. SYNCED EMAILS
-- ========================
create table if not exists outlook_emails (
  id uuid primary key default gen_random_uuid(),
  outlook_message_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text,
  body_preview text,
  body_html text,
  body_text text,
  from_email text,
  from_name text,
  to_emails text[] default '{}',
  cc_emails text[] default '{}',
  received_at timestamptz,
  sent_at timestamptz,
  is_sent boolean not null default false,
  is_read boolean not null default false,
  has_attachments boolean not null default false,
  folder text,                            -- 'inbox' | 'sent' | 'drafts'
  linked_contact_id uuid references contacts(id) on delete set null,
  linked_deal_id uuid references deals(id) on delete set null,
  auto_linked boolean not null default false,
  manually_linked boolean not null default false,
  ignored boolean not null default false, -- user marked as ignore
  crm_logged boolean not null default false,
  crm_logged_at timestamptz,
  sync_source text,                       -- 'auto' | 'manual'
  conversation_id text,                   -- for threading
  created_at timestamptz not null default now()
);

create index if not exists idx_outlook_emails_user on outlook_emails(user_id);
create index if not exists idx_outlook_emails_received on outlook_emails(received_at desc);
create index if not exists idx_outlook_emails_from on outlook_emails(from_email);
create index if not exists idx_outlook_emails_folder on outlook_emails(folder);
create index if not exists idx_outlook_emails_linked_deal on outlook_emails(linked_deal_id);
create index if not exists idx_outlook_emails_linked_contact on outlook_emails(linked_contact_id);
create index if not exists idx_outlook_emails_unlinked on outlook_emails(linked_contact_id, ignored)
  where linked_contact_id is null and ignored = false;

alter table outlook_emails enable row level security;

create policy "outlook_emails_dev_select" on outlook_emails
  for select using (is_developer());
create policy "outlook_emails_dev_insert" on outlook_emails
  for insert with check (is_developer());
create policy "outlook_emails_dev_update" on outlook_emails
  for update using (is_developer());
create policy "outlook_emails_dev_delete" on outlook_emails
  for delete using (is_developer());

-- ========================
-- 3. SYNC LOG
-- ========================
create table if not exists outlook_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  sync_type text not null,                -- 'full' | 'delta' | 'manual'
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  emails_synced integer not null default 0,
  emails_linked integer not null default 0,
  errors jsonb default '[]'::jsonb,
  status text not null default 'running'  -- 'running' | 'complete' | 'failed'
);

create index if not exists idx_outlook_sync_log_started on outlook_sync_log(started_at desc);

alter table outlook_sync_log enable row level security;

create policy "outlook_sync_log_dev_select" on outlook_sync_log
  for select using (is_developer());
create policy "outlook_sync_log_dev_insert" on outlook_sync_log
  for insert with check (is_developer());
create policy "outlook_sync_log_dev_update" on outlook_sync_log
  for update using (is_developer());
create policy "outlook_sync_log_dev_delete" on outlook_sync_log
  for delete using (is_developer());

-- ========================
-- 4. PERSONAL OUTREACH PROSPECTS
-- ========================
-- IMPORTANT: This table is strictly for Loud CRM business
-- development outreach. It MUST NOT reference or mix with any
-- customer (Van Wagner, etc.) CRM data. No property_id,
-- no deal_id, no contact_id — fully isolated.
create table if not exists outlook_prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text not null,
  organization text,
  title text,
  industry text,                          -- 'conference_events' | 'minor_league_sports'
  linkedin_url text,
  outreach_status text not null default 'not_contacted',
    -- not_contacted | contacted | responded | demo_scheduled
    -- | trial_started | converted | not_interested
  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  last_email_subject text,
  follow_up_due date,
  notes text,
  signed_up boolean not null default false,
  signed_up_at timestamptz,
  converted_to_paid boolean not null default false,
  converted_at timestamptz,
  plan_converted_to text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, email)
);

create index if not exists idx_outlook_prospects_status on outlook_prospects(outreach_status);
create index if not exists idx_outlook_prospects_follow_up on outlook_prospects(follow_up_due)
  where outreach_status in ('contacted', 'responded');
create index if not exists idx_outlook_prospects_email on outlook_prospects(lower(email));

alter table outlook_prospects enable row level security;

create policy "outlook_prospects_dev_select" on outlook_prospects
  for select using (is_developer());
create policy "outlook_prospects_dev_insert" on outlook_prospects
  for insert with check (is_developer());
create policy "outlook_prospects_dev_update" on outlook_prospects
  for update using (is_developer());
create policy "outlook_prospects_dev_delete" on outlook_prospects
  for delete using (is_developer());

-- ========================
-- 5. OUTREACH TEMPLATES
-- ========================
create table if not exists outlook_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  industry text,                          -- 'conference_events' | 'minor_league_sports' | 'both'
  stage text,                             -- 'initial' | 'follow_up_1' | 'follow_up_2' | 'demo_request' | 'post_demo' | 'trial_follow_up'
  is_seeded boolean not null default false,
  times_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_outlook_templates_stage on outlook_templates(stage);

alter table outlook_templates enable row level security;

create policy "outlook_templates_dev_select" on outlook_templates
  for select using (is_developer());
create policy "outlook_templates_dev_insert" on outlook_templates
  for insert with check (is_developer());
create policy "outlook_templates_dev_update" on outlook_templates
  for update using (is_developer());
create policy "outlook_templates_dev_delete" on outlook_templates
  for delete using (is_developer());

-- ========================
-- 6. TEMPLATE USAGE LOG (for analytics)
-- ========================
create table if not exists outlook_template_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references outlook_templates(id) on delete set null,
  prospect_id uuid references outlook_prospects(id) on delete set null,
  sent_at timestamptz not null default now(),
  got_response boolean not null default false,
  got_response_at timestamptz,
  resulted_in_demo boolean not null default false,
  resulted_in_trial boolean not null default false,
  resulted_in_paid boolean not null default false
);

create index if not exists idx_outlook_template_usage_template on outlook_template_usage(template_id);
create index if not exists idx_outlook_template_usage_sent on outlook_template_usage(sent_at desc);

alter table outlook_template_usage enable row level security;

create policy "outlook_template_usage_dev_select" on outlook_template_usage
  for select using (is_developer());
create policy "outlook_template_usage_dev_insert" on outlook_template_usage
  for insert with check (is_developer());
create policy "outlook_template_usage_dev_update" on outlook_template_usage
  for update using (is_developer());
create policy "outlook_template_usage_dev_delete" on outlook_template_usage
  for delete using (is_developer());

-- ========================
-- 7. FEATURE FLAG ROW
-- ========================
-- Hidden feature flag. Never listed in the standard flags UI.
-- Default OFF. Only the developer console at /dev/feature-flags
-- exposes this row.
--
-- IMPORTANT: drop the feature_flags_module_check CHECK constraint
-- from migration 045 FIRST. That constraint had a hardcoded enum
-- of allowed module names and 'outlook_integration' is not in it,
-- so the INSERT below would fail with error 23514. 'on conflict'
-- does NOT catch check constraint violations — it only handles
-- unique constraint conflicts. Dropping the constraint is the
-- right long-term fix because new feature flags should not
-- require a DB migration (see migration 058 which also drops
-- this, now doubled up for safety).
alter table feature_flags drop constraint if exists feature_flags_module_check;

insert into feature_flags (module, enabled, updated_at)
values ('outlook_integration', false, now())
on conflict (module) do nothing;

-- ========================
-- 8. CONTACT LAST-CONTACTED COLUMN
-- ========================
-- Used by sync to update the standard Loud CRM contact card.
-- Adds the column only if it isn't already there.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'contacts' and column_name = 'last_contacted_at'
  ) then
    alter table contacts add column last_contacted_at timestamptz;
  end if;
end $$;

-- ========================
-- 9. SEED DEFAULT TEMPLATES
-- ========================
-- Templates are seeded the first time the developer visits
-- /dev/outlook/templates (via templateService.seedIfEmpty).
-- No hardcoded seeds in SQL so content can be iterated in JS.

-- ========================
-- DONE
-- ========================

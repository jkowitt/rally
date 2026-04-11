-- ============================================================
-- MIGRATION 054 — EMAIL MARKETING SYSTEM
-- ============================================================
-- Developer-only (flag: email_marketing_developer) until
-- email_marketing_public is toggled on. When public is on, the
-- public RLS policies also allow admin+ roles per organization.
--
-- Reuses existing tables:
--   - contacts   (pipeline source)
--   - deals      (deal_stage + deal_value for subscribers)
--   - activities (CRM activity integration)
--   - feature_flags (hidden flags defined in code via HIDDEN_MODULES)
-- Does NOT touch:
--   - email_sequences, email_sequence_emails,
--     email_sequence_enrollments, email_sends (migration 051)
-- ============================================================

-- ========================
-- HELPER: can_access_email_marketing()
-- ========================
-- Returns true when:
--   (a) caller is developer AND email_marketing_developer flag is ON, OR
--   (b) email_marketing_public flag is ON AND caller is admin+ role
--       AND the row belongs to their property/organization.
-- For property scoping in the public case, individual policies add
-- their own `property_id = get_user_property_id()` check.
create or replace function can_access_email_marketing_dev()
returns boolean as $$
  select is_developer() and coalesce(
    (select enabled from feature_flags where module = 'email_marketing_developer'),
    false
  )
$$ language sql security definer stable;

create or replace function can_access_email_marketing_public()
returns boolean as $$
  select coalesce(
    (select enabled from feature_flags where module = 'email_marketing_public'),
    false
  ) and exists(
    select 1 from profiles
    where id = auth.uid() and role in ('developer', 'businessops', 'admin')
  )
$$ language sql security definer stable;

create or replace function can_access_email_marketing()
returns boolean as $$
  select can_access_email_marketing_dev() or can_access_email_marketing_public()
$$ language sql security definer stable;

-- ========================
-- 1. EMAIL LISTS
-- ========================
create table if not exists email_lists (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  description text,
  list_type text not null default 'custom',
    -- 'prospect' | 'trial' | 'customer' | 'newsletter'
    -- | 'segment' | 'pipeline' | 'custom'
  is_dynamic boolean not null default false,
  dynamic_rules jsonb default '{}'::jsonb,
  subscriber_count integer not null default 0,
  active_count integer not null default 0,
  unsubscribed_count integer not null default 0,
  bounced_count integer not null default 0,
  tags text[] default '{}',
  is_public boolean not null default false,
  is_pipeline_list boolean not null default false,
  last_campaign_sent_at timestamptz,
  last_synced_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_lists_property on email_lists(property_id);
create index if not exists idx_email_lists_type on email_lists(list_type);

alter table email_lists enable row level security;

create policy "email_lists_dev_select" on email_lists
  for select using (
    can_access_email_marketing_dev()
    or (can_access_email_marketing_public() and (property_id is null or property_id = get_user_property_id()))
  );
create policy "email_lists_dev_insert" on email_lists
  for insert with check (can_access_email_marketing());
create policy "email_lists_dev_update" on email_lists
  for update using (can_access_email_marketing());
create policy "email_lists_dev_delete" on email_lists
  for delete using (can_access_email_marketing());

-- ========================
-- 2. EMAIL SUBSCRIBERS
-- ========================
create table if not exists email_subscribers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  organization text,
  title text,
  industry text,
  phone text,
  linkedin_url text,
  source text not null default 'manual',
    -- 'manual' | 'import' | 'signup' | 'outlook_sync'
    -- | 'pipeline_sync' | 'api'
  status text not null default 'active',
    -- 'active' | 'unsubscribed' | 'bounced' | 'complained' | 'cleaned'
  global_unsubscribe boolean not null default false,
  unsubscribed_at timestamptz,
  unsubscribe_reason text,
  bounce_type text,
  bounced_at timestamptz,
  tags text[] default '{}',
  custom_fields jsonb default '{}'::jsonb,
  loud_legacy_user_id uuid references auth.users(id) on delete set null,
  loud_legacy_plan text,
  crm_contact_id uuid references contacts(id) on delete set null,
  crm_synced boolean not null default false,
  crm_synced_at timestamptz,
  crm_sync_source text,
  is_recent_add boolean not null default false,
  recent_add_flagged_at timestamptz,
  recent_add_cleared_at timestamptz,
  deal_stage text,
  deal_value numeric,
  engagement_score integer not null default 0,
  last_opened_at timestamptz,
  last_clicked_at timestamptz,
  total_opens integer not null default 0,
  total_clicks integer not null default 0,
  last_replied_at timestamptz,
  total_replies integer not null default 0,
  unsubscribe_token text unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, email)
);

create index if not exists idx_email_subscribers_email on email_subscribers(lower(email));
create index if not exists idx_email_subscribers_status on email_subscribers(status);
create index if not exists idx_email_subscribers_crm_contact on email_subscribers(crm_contact_id);
create index if not exists idx_email_subscribers_recent_adds on email_subscribers(recent_add_flagged_at desc) where is_recent_add = true;
create index if not exists idx_email_subscribers_unsubscribe_token on email_subscribers(unsubscribe_token);
create index if not exists idx_email_subscribers_property on email_subscribers(property_id);

alter table email_subscribers enable row level security;

create policy "email_subscribers_select" on email_subscribers
  for select using (
    can_access_email_marketing_dev()
    or (can_access_email_marketing_public() and (property_id is null or property_id = get_user_property_id()))
  );
create policy "email_subscribers_insert" on email_subscribers
  for insert with check (can_access_email_marketing());
create policy "email_subscribers_update" on email_subscribers
  for update using (can_access_email_marketing());
create policy "email_subscribers_delete" on email_subscribers
  for delete using (can_access_email_marketing());

-- ========================
-- 3. LIST MEMBERSHIP
-- ========================
create table if not exists email_list_subscribers (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references email_lists(id) on delete cascade,
  subscriber_id uuid not null references email_subscribers(id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  source text,
  status text not null default 'active',
  is_recent_add boolean not null default false,
  recent_add_flagged_at timestamptz,
  unique(list_id, subscriber_id)
);

create index if not exists idx_list_subscribers_list on email_list_subscribers(list_id);
create index if not exists idx_list_subscribers_subscriber on email_list_subscribers(subscriber_id);

alter table email_list_subscribers enable row level security;

create policy "list_subscribers_all" on email_list_subscribers
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 4. SUBSCRIBER EVENTS
-- ========================
create table if not exists email_subscriber_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references email_subscribers(id) on delete cascade,
  event_type text not null,
    -- 'subscribed' | 'unsubscribed' | 'bounced' | 'complained'
    -- | 'opened' | 'clicked' | 'converted' | 'pipeline_synced'
    -- | 'replied' | 'conversation_started'
  campaign_id uuid,
  metadata jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_subscriber_events_subscriber on email_subscriber_events(subscriber_id, occurred_at desc);
create index if not exists idx_subscriber_events_type on email_subscriber_events(event_type);

alter table email_subscriber_events enable row level security;

create policy "subscriber_events_all" on email_subscriber_events
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 5. TAGS
-- ========================
create table if not exists email_tags (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  color text default '#E8B84B',
  subscriber_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(property_id, name)
);

alter table email_tags enable row level security;

create policy "email_tags_all" on email_tags
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 6. PIPELINE SYNC SETTINGS
-- ========================
create table if not exists pipeline_sync_settings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  auto_sync_enabled boolean not null default true,
  auto_sync_target_list_ids uuid[] default '{}',
  sync_all_contacts boolean not null default true,
  sync_by_deal_stage text[] default '{}',
  sync_by_industry text[] default '{}',
  recent_add_display_hours integer not null default 72,
  last_bulk_sync_at timestamptz,
  total_synced integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id)
);

alter table pipeline_sync_settings enable row level security;

create policy "pipeline_sync_settings_all" on pipeline_sync_settings
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 7. PIPELINE SYNC LOG
-- ========================
create table if not exists pipeline_sync_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  sync_type text not null,
  contact_id uuid references contacts(id) on delete set null,
  subscriber_id uuid references email_subscribers(id) on delete set null,
  action text not null,
  skip_reason text,
  synced_at timestamptz not null default now(),
  synced_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_pipeline_sync_log_synced on pipeline_sync_log(synced_at desc);

alter table pipeline_sync_log enable row level security;

create policy "pipeline_sync_log_all" on pipeline_sync_log
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 8. EMAIL TEMPLATES
-- ========================
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'custom',
    -- 'newsletter' | 'promotional' | 'transactional'
    -- | 'drip' | 'announcement' | 'custom'
  subject_line text,
  preview_text text,
  html_content text,
  plain_text_content text,
  json_structure jsonb,
  thumbnail_url text,
  is_system_template boolean not null default false,
  tags text[] default '{}',
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table email_templates enable row level security;

create policy "email_templates_all" on email_templates
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 9. EMAIL CAMPAIGNS
-- ========================
create table if not exists email_campaigns (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  subject_line text not null,
  preview_text text,
  from_name text,
  from_email text,
  reply_to_email text,
  template_id uuid references email_templates(id) on delete set null,
  html_content text,
  plain_text_content text,
  list_ids uuid[] default '{}',
  segment_filters jsonb default '{}'::jsonb,
  exclude_list_ids uuid[] default '{}',
  status text not null default 'draft',
    -- 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
  campaign_type text not null default 'regular',
    -- 'regular' | 'ab_test' | 'automated'
  ab_variant_subject text,
  ab_variant_html text,
  ab_split_percent integer default 50,
  ab_winner_criterion text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  total_recipients integer not null default 0,
  emails_sent integer not null default 0,
  emails_delivered integer not null default 0,
  unique_opens integer not null default 0,
  unique_clicks integer not null default 0,
  emails_bounced integer not null default 0,
  emails_unsubscribed integer not null default 0,
  emails_complained integer not null default 0,
  reply_count integer not null default 0,
  open_rate numeric not null default 0,
  click_rate numeric not null default 0,
  reply_rate numeric not null default 0,
  bounce_rate numeric not null default 0,
  revenue_attributed numeric not null default 0,
  tags text[] default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_status on email_campaigns(status);
create index if not exists idx_campaigns_scheduled on email_campaigns(scheduled_for) where status = 'scheduled';

alter table email_campaigns enable row level security;

create policy "email_campaigns_all" on email_campaigns
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 10. CAMPAIGN SENDS
-- ========================
create table if not exists email_campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references email_campaigns(id) on delete cascade,
  subscriber_id uuid references email_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'pending',
    -- 'pending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
  sent_at timestamptz,
  opened_at timestamptz,
  first_opened_at timestamptz,
  open_count integer not null default 0,
  clicked_at timestamptz,
  click_count integer not null default 0,
  replied_at timestamptz,
  conversation_id uuid,
  bounced_at timestamptz,
  bounce_type text,
  unsubscribed_at timestamptz,
  tracking_pixel_id text unique default encode(gen_random_bytes(16), 'hex'),
  message_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_sends_campaign on email_campaign_sends(campaign_id);
create index if not exists idx_campaign_sends_subscriber on email_campaign_sends(subscriber_id);
create index if not exists idx_campaign_sends_tracking on email_campaign_sends(tracking_pixel_id);
create index if not exists idx_campaign_sends_message_id on email_campaign_sends(message_id);

alter table email_campaign_sends enable row level security;

create policy "campaign_sends_all" on email_campaign_sends
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 11. CAMPAIGN TRACKED LINKS
-- ========================
create table if not exists email_campaign_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references email_campaigns(id) on delete cascade,
  original_url text not null,
  tracking_token text unique not null default encode(gen_random_bytes(12), 'hex'),
  click_count integer not null default 0,
  unique_clicks integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_links_token on email_campaign_links(tracking_token);

alter table email_campaign_links enable row level security;

create policy "campaign_links_all" on email_campaign_links
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 12. CONVERSATIONS
-- ========================
create table if not exists email_conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  subscriber_id uuid references email_subscribers(id) on delete set null,
  crm_contact_id uuid references contacts(id) on delete set null,
  crm_deal_id uuid references deals(id) on delete set null,
  campaign_id uuid references email_campaigns(id) on delete set null,
  sequence_id uuid, -- references email_sequences from migration 051
  subject text,
  status text not null default 'open',
    -- 'open' | 'replied' | 'closed' | 'archived'
  priority text not null default 'normal',
    -- 'normal' | 'high' | 'urgent'
  assigned_to uuid references auth.users(id) on delete set null,
  tags text[] default '{}',
  last_message_at timestamptz not null default now(),
  last_message_from text not null default 'subscriber',
  message_count integer not null default 0,
  unread_count integer not null default 0,
  is_crm_activity_created boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_status on email_conversations(status);
create index if not exists idx_conversations_last_msg on email_conversations(last_message_at desc);
create index if not exists idx_conversations_subscriber on email_conversations(subscriber_id);

alter table email_conversations enable row level security;

create policy "conversations_all" on email_conversations
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 13. CONVERSATION MESSAGES
-- ========================
create table if not exists email_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references email_conversations(id) on delete cascade,
  direction text not null, -- 'inbound' | 'outbound'
  from_email text,
  from_name text,
  to_email text,
  subject text,
  body_html text,
  body_text text,
  is_read boolean not null default false,
  read_at timestamptz,
  provider_message_id text,
  in_reply_to text,
  attachments jsonb,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_conv_messages_conversation on email_conversation_messages(conversation_id, created_at);
create index if not exists idx_conv_messages_provider_id on email_conversation_messages(provider_message_id);

alter table email_conversation_messages enable row level security;

create policy "conv_messages_all" on email_conversation_messages
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 14. CONVERSATION NOTES
-- ========================
create table if not exists email_conversation_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references email_conversations(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table email_conversation_notes enable row level security;

create policy "conv_notes_all" on email_conversation_notes
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 15. SUPPRESSION LIST (global hard opt-outs)
-- ========================
create table if not exists email_suppression_list (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text not null default 'unsubscribed',
    -- 'unsubscribed' | 'hard_bounce' | 'complained' | 'manual'
  added_at timestamptz not null default now()
);

create index if not exists idx_suppression_email on email_suppression_list(lower(email));

alter table email_suppression_list enable row level security;

create policy "suppression_all" on email_suppression_list
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 16. FEATURE FLAG SEED ROWS
-- ========================
insert into feature_flags (module, enabled, updated_at)
values
  ('email_marketing_developer', false, now()),
  ('email_marketing_public', false, now())
on conflict (module) do nothing;

-- ========================
-- 17. TRIGGER: new contact → mark for sync
-- ========================
-- Sets a flag in a small queue table so the pipeline-sync edge
-- function can pick up new contacts. We deliberately DO NOT call
-- an edge function from a DB trigger (that path is flaky) — instead
-- we enqueue and let a cron-based sync drain the queue.
create table if not exists pipeline_sync_queue (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  enqueued_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(contact_id)
);

create index if not exists idx_pipeline_sync_queue_pending on pipeline_sync_queue(enqueued_at)
  where processed_at is null;

alter table pipeline_sync_queue enable row level security;
create policy "pipeline_sync_queue_all" on pipeline_sync_queue
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

create or replace function enqueue_contact_for_email_sync()
returns trigger as $$
begin
  insert into pipeline_sync_queue (contact_id)
  values (new.id)
  on conflict (contact_id) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists contacts_enqueue_email_sync on contacts;
create trigger contacts_enqueue_email_sync
  after insert or update of email on contacts
  for each row execute function enqueue_contact_for_email_sync();

-- ========================
-- DONE
-- ========================

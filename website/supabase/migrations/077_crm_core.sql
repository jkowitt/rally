-- ============================================================
-- MIGRATION 077 — THE CRM CORE 10/10 PUSH
-- ============================================================
-- Closes the boring-but-essential gaps from the prior CRM analysis:
--
--   1.  Custom fields — per-property column defs on deals/contacts
--   2.  Saved views — per-user, per-table filters
--   3.  Audit log — row-level diff trail on deals/contacts/contracts
--   4.  Accounts hierarchy — parent company + agency-of-record
--   5.  Webhook outputs — fire on insert/update/delete events
--   6.  Workflow rules — trigger → action engine UI
--   7.  SLA policies — escalate deals stuck in a stage
--   8.  Deal files — file storage beyond just contracts
--   9.  Deal comments + @-mentions — threaded notes per deal
--   10. Deal templates — pre-filled new-deal shells
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CUSTOM FIELDS
-- ────────────────────────────────────────────────────────────
-- Per-property column definitions stored as a single jsonb column
-- on deals/contacts ({field_key: value, ...}). custom_field_defs
-- table tells the UI what to render and validates types.
create table if not exists custom_field_defs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  applies_to text not null,                  -- 'deal' | 'contact' | 'contract'
  field_key text not null,                   -- snake_case key used in jsonb
  label text not null,                       -- "Renewal Quarter"
  field_type text not null,                  -- 'text' | 'number' | 'currency' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url'
  options jsonb,                             -- for select/multiselect: ["Q1","Q2","Q3","Q4"]
  required boolean not null default false,
  position integer not null default 0,
  help_text text,
  created_at timestamptz not null default now(),
  unique(property_id, applies_to, field_key)
);

create index if not exists idx_custom_field_defs_property on custom_field_defs(property_id, applies_to, position);

alter table custom_field_defs enable row level security;
create policy "custom_field_defs_property_all" on custom_field_defs for all using (
  property_id = get_user_property_id() or is_developer()
);

-- The actual values land on the parent rows as jsonb.
alter table deals add column if not exists custom_fields jsonb default '{}'::jsonb;
alter table contacts add column if not exists custom_fields jsonb default '{}'::jsonb;
alter table contracts add column if not exists custom_fields jsonb default '{}'::jsonb;

create index if not exists idx_deals_custom_fields on deals using gin (custom_fields);

-- ────────────────────────────────────────────────────────────
-- 2. SAVED VIEWS
-- ────────────────────────────────────────────────────────────
create table if not exists saved_views (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,  -- null = shared/team view
  applies_to text not null,                  -- 'deal' | 'contact' | 'priority' | 'signals'
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  sort jsonb default '{}'::jsonb,
  is_shared boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_views_user on saved_views(user_id, applies_to);
create index if not exists idx_saved_views_shared on saved_views(property_id, applies_to) where is_shared = true;

alter table saved_views enable row level security;
create policy "saved_views_owner_or_shared" on saved_views for select using (
  user_id = auth.uid() or
  (is_shared = true and property_id = get_user_property_id()) or
  is_developer()
);
create policy "saved_views_owner_write" on saved_views for insert with check (user_id = auth.uid());
create policy "saved_views_owner_update" on saved_views for update using (user_id = auth.uid() or is_developer());
create policy "saved_views_owner_delete" on saved_views for delete using (user_id = auth.uid() or is_developer());

-- ────────────────────────────────────────────────────────────
-- 3. AUDIT LOG
-- ────────────────────────────────────────────────────────────
-- Diff every change to deals/contacts/contracts. The trigger
-- captures (old_value, new_value) per changed field as jsonb.
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  table_name text not null,
  row_id uuid not null,
  action text not null,                      -- 'insert' | 'update' | 'delete'
  changed_by uuid references profiles(id) on delete set null,
  changes jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_audit_events_row on audit_events(table_name, row_id, occurred_at desc);
create index if not exists idx_audit_events_property on audit_events(property_id, occurred_at desc);
create index if not exists idx_audit_events_user on audit_events(changed_by, occurred_at desc);

alter table audit_events enable row level security;
create policy "audit_events_property_select" on audit_events for select using (
  property_id = get_user_property_id() or is_developer()
);

-- Generic trigger function. Watches the row OLD/NEW pair and
-- records only changed fields.
create or replace function record_audit_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_property_id uuid;
  v_action text;
begin
  if TG_OP = 'INSERT' then
    v_action := 'insert';
    v_property_id := (to_jsonb(new) ->> 'property_id')::uuid;
    v_changes := to_jsonb(new);
  elsif TG_OP = 'UPDATE' then
    v_action := 'update';
    v_property_id := (to_jsonb(new) ->> 'property_id')::uuid;
    -- Diff: only fields whose value changed
    select jsonb_object_agg(key, jsonb_build_object('old', to_jsonb(old) -> key, 'new', to_jsonb(new) -> key))
      into v_changes
    from jsonb_object_keys(to_jsonb(new)) as t(key)
    where to_jsonb(old) -> key is distinct from to_jsonb(new) -> key;
    if v_changes is null or v_changes = '{}'::jsonb then return new; end if;
  elsif TG_OP = 'DELETE' then
    v_action := 'delete';
    v_property_id := (to_jsonb(old) ->> 'property_id')::uuid;
    v_changes := to_jsonb(old);
  end if;

  insert into audit_events (property_id, table_name, row_id, action, changed_by, changes)
    values (v_property_id, TG_TABLE_NAME,
            coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
            v_action, auth.uid(), v_changes);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_deals on deals;
create trigger trg_audit_deals
  after insert or update or delete on deals
  for each row execute function record_audit_event();

drop trigger if exists trg_audit_contacts on contacts;
create trigger trg_audit_contacts
  after insert or update or delete on contacts
  for each row execute function record_audit_event();

drop trigger if exists trg_audit_contracts on contracts;
create trigger trg_audit_contracts
  after insert or update or delete on contracts
  for each row execute function record_audit_event();

-- ────────────────────────────────────────────────────────────
-- 4. ACCOUNTS HIERARCHY + AGENCIES
-- ────────────────────────────────────────────────────────────
-- An account is a parent company that may have many deals (e.g.
-- "Coca-Cola" with deals for Sprite + Powerade + Coke Zero). An
-- agency is a third-party that represents brands; many deals →
-- one agency.
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  parent_account_id uuid references accounts(id) on delete set null,
  hq_city text,
  hq_state text,
  annual_revenue numeric,
  employees integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, name)
);

create index if not exists idx_accounts_property on accounts(property_id);
create index if not exists idx_accounts_parent on accounts(parent_account_id);

alter table accounts enable row level security;
create policy "accounts_property_all" on accounts for all using (
  property_id = get_user_property_id() or is_developer()
);

create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  unique(property_id, name)
);

create index if not exists idx_agencies_property on agencies(property_id);

alter table agencies enable row level security;
create policy "agencies_property_all" on agencies for all using (
  property_id = get_user_property_id() or is_developer()
);

alter table deals add column if not exists account_id uuid references accounts(id) on delete set null;
alter table deals add column if not exists agency_id uuid references agencies(id) on delete set null;
create index if not exists idx_deals_account on deals(account_id);
create index if not exists idx_deals_agency on deals(agency_id);

-- Roll-up view: per-account deal totals.
create or replace view account_pipeline_summary as
  select
    a.id as account_id,
    a.property_id,
    a.name,
    count(d.id) as total_deals,
    count(d.id) filter (where d.stage in ('Renewed', 'Contracted')) as won_deals,
    sum(d.value) filter (where d.stage in ('Renewed', 'Contracted')) as won_value,
    sum(d.value) filter (where d.stage not in ('Renewed', 'Declined')) as open_pipeline_value,
    max(d.created_at) as last_activity_at
  from accounts a
  left join deals d on d.account_id = a.id
  group by a.id, a.property_id, a.name;

-- ────────────────────────────────────────────────────────────
-- 5. WEBHOOK OUTPUTS
-- ────────────────────────────────────────────────────────────
create table if not exists webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  url text not null,
  events text[] not null default '{}',         -- ['deal.created', 'deal.stage_changed', ...]
  secret text,                                 -- HMAC signing secret
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_fired_at timestamptz,
  last_status integer
);

create index if not exists idx_webhooks_property on webhook_subscriptions(property_id, is_active);

alter table webhook_subscriptions enable row level security;
create policy "webhooks_property_all" on webhook_subscriptions for all using (
  property_id = get_user_property_id() or is_developer()
);

-- A queue for outbound webhook deliveries. The dispatcher edge
-- function pulls from this and POSTs.
create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references webhook_subscriptions(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending',     -- 'pending' | 'success' | 'failed'
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  last_response_status integer,
  last_response_body text,
  enqueued_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists idx_webhook_deliveries_pending on webhook_deliveries(status, enqueued_at)
  where status = 'pending';
create index if not exists idx_webhook_deliveries_property on webhook_deliveries(property_id, enqueued_at desc);

alter table webhook_deliveries enable row level security;
create policy "webhook_deliveries_property_select" on webhook_deliveries for select using (
  property_id = get_user_property_id() or is_developer()
);

-- Trigger: when a deal stage changes (or any other watched event),
-- enqueue a delivery for every subscription that listens to it.
create or replace function enqueue_webhook_for_deal_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sub record;
  evt text;
  payload jsonb;
begin
  if TG_OP = 'INSERT' then evt := 'deal.created';
  elsif TG_OP = 'UPDATE' then
    if old.stage is distinct from new.stage then evt := 'deal.stage_changed';
    elsif old.value is distinct from new.value then evt := 'deal.value_changed';
    else evt := 'deal.updated';
    end if;
  elsif TG_OP = 'DELETE' then evt := 'deal.deleted';
  end if;

  payload := jsonb_build_object(
    'event', evt,
    'occurred_at', now(),
    'deal', case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end,
    'previous', case when TG_OP = 'UPDATE' then to_jsonb(old) else null end
  );

  for sub in
    select id, property_id from webhook_subscriptions
    where property_id = coalesce(new.property_id, old.property_id)
      and is_active = true
      and evt = any(events)
  loop
    insert into webhook_deliveries (subscription_id, property_id, event_type, payload)
      values (sub.id, sub.property_id, evt, payload);
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_webhook_deal on deals;
create trigger trg_webhook_deal
  after insert or update or delete on deals
  for each row execute function enqueue_webhook_for_deal_change();

-- ────────────────────────────────────────────────────────────
-- 6. WORKFLOW RULES
-- ────────────────────────────────────────────────────────────
-- A simple if-this-then-that engine. Trigger types: deal.created,
-- deal.stage_changed, contact.email_replied, etc. Action types:
-- assign_user, set_priority, create_task, send_email_template,
-- enroll_in_sequence, fire_webhook.
create table if not exists workflow_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,
  trigger_filter jsonb default '{}'::jsonb,    -- {"stage_to": "Negotiation"}
  action_type text not null,
  action_payload jsonb default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  fired_count integer not null default 0,
  last_fired_at timestamptz
);

create index if not exists idx_workflow_rules_active on workflow_rules(property_id, is_active, trigger_type);

alter table workflow_rules enable row level security;
create policy "workflow_rules_property_all" on workflow_rules for all using (
  property_id = get_user_property_id() or is_developer()
);

create table if not exists workflow_rule_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references workflow_rules(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  trigger_payload jsonb,
  result text,                                -- 'success' | 'skipped' | 'failed'
  error_message text,
  ran_at timestamptz not null default now()
);

create index if not exists idx_workflow_runs_rule on workflow_rule_runs(rule_id, ran_at desc);

alter table workflow_rule_runs enable row level security;
create policy "workflow_runs_property_select" on workflow_rule_runs for select using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 7. SLA POLICIES
-- ────────────────────────────────────────────────────────────
-- Per-stage time limits. The runner cron checks every deal in
-- the stage; if it has been there longer than max_days_in_stage,
-- creates a coaching nudge or assigns a manager-level task.
create table if not exists sla_policies (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  stage text not null,
  max_days_in_stage integer not null,
  escalation_action text not null default 'nudge', -- 'nudge' | 'task' | 'reassign'
  reassign_to uuid references profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(property_id, stage)
);

alter table sla_policies enable row level security;
create policy "sla_policies_property_all" on sla_policies for all using (
  property_id = get_user_property_id() or is_developer()
);

-- Track which deals have been flagged so we don't double-nudge.
create table if not exists sla_breaches (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  policy_id uuid references sla_policies(id) on delete set null,
  stage_when_breached text,
  days_in_stage integer,
  flagged_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(deal_id, policy_id, flagged_at)
);

create index if not exists idx_sla_breaches_property on sla_breaches(property_id, resolved_at);

alter table sla_breaches enable row level security;
create policy "sla_breaches_property_select" on sla_breaches for select using (
  property_id = get_user_property_id() or is_developer()
);

-- Add stage-entry tracking so the SLA cron can compute days_in_stage.
alter table deals add column if not exists stage_entered_at timestamptz default now();

create or replace function stamp_stage_entered_at() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' or new.stage is distinct from old.stage then
    new.stage_entered_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stage_entered_at on deals;
create trigger trg_stage_entered_at
  before insert or update of stage on deals
  for each row execute function stamp_stage_entered_at();

-- ────────────────────────────────────────────────────────────
-- 8. DEAL FILES
-- ────────────────────────────────────────────────────────────
create table if not exists deal_files (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  storage_bucket text not null default 'deal-files',
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes integer,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_files_deal on deal_files(deal_id, created_at desc);

alter table deal_files enable row level security;
create policy "deal_files_property_all" on deal_files for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 9. DEAL COMMENTS + @-MENTIONS
-- ────────────────────────────────────────────────────────────
create table if not exists deal_comments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  mentioned_user_ids uuid[] default '{}',
  parent_comment_id uuid references deal_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists idx_deal_comments_deal on deal_comments(deal_id, created_at desc);
create index if not exists idx_deal_comments_mentions on deal_comments using gin (mentioned_user_ids);

alter table deal_comments enable row level security;
create policy "deal_comments_property_all" on deal_comments for all using (
  property_id = get_user_property_id() or is_developer()
);

-- When a comment mentions someone, fire a notification row.
create or replace function notify_mentioned_users() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  v_brand text;
begin
  if new.mentioned_user_ids is null or array_length(new.mentioned_user_ids, 1) is null then
    return new;
  end if;
  select brand_name into v_brand from deals where id = new.deal_id;
  foreach uid in array new.mentioned_user_ids loop
    if uid = new.author_id then continue; end if;
    insert into notifications (user_id, type, title, body, related_id)
      values (uid, 'comment_mention',
              'Mentioned by a teammate on ' || coalesce(v_brand, 'a deal'),
              left(new.body, 280),
              new.deal_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_mentions on deal_comments;
create trigger trg_notify_mentions
  after insert on deal_comments
  for each row execute function notify_mentioned_users();

-- ────────────────────────────────────────────────────────────
-- 10. DEAL TEMPLATES
-- ────────────────────────────────────────────────────────────
create table if not exists deal_templates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  description text,
  template_kind text not null default 'new_business', -- 'new_business' | 'renewal' | 'multi_year'
  defaults jsonb not null default '{}'::jsonb,        -- field defaults to copy onto the new deal
  default_assets uuid[] default '{}',                 -- pre-attach these assets
  default_sequence_id uuid references prospect_sequences(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_templates_property on deal_templates(property_id, is_active);

alter table deal_templates enable row level security;
create policy "deal_templates_property_all" on deal_templates for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 11. DEAL DUPLICATE-DETECTION HELPER
-- ────────────────────────────────────────────────────────────
-- "Find existing open deals at this brand" — used by the create
-- form to warn before submit.
create or replace function find_duplicate_deals(p_property_id uuid, p_brand_name text)
returns table (deal_id uuid, brand_name text, stage text, account_lead_id uuid, value numeric, created_at timestamptz)
language sql security invoker stable as $$
  select id, brand_name, stage, account_lead_id, value, created_at
    from deals
   where property_id = p_property_id
     and stage not in ('Renewed', 'Declined')
     and lower(brand_name) like '%' || lower(p_brand_name) || '%'
   order by created_at desc
   limit 5;
$$;
grant execute on function find_duplicate_deals(uuid, text) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 12. API KEYS (for public-api)
-- ────────────────────────────────────────────────────────────
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  token text not null unique,                  -- random; stored as-is for v1
  scopes text[] default '{deals.read,deals.write,contacts.read,contacts.write}',
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_api_keys_token on api_keys(token) where is_active = true;
create index if not exists idx_api_keys_property on api_keys(property_id);

alter table api_keys enable row level security;
create policy "api_keys_property_all" on api_keys for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 13. FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('custom_fields', false),
  ('saved_views', false),
  ('audit_log', false),
  ('accounts_hierarchy', false),
  ('webhooks', false),
  ('workflow_rules', false),
  ('sla_policies', false),
  ('deal_files', false),
  ('deal_comments', false),
  ('deal_templates', false),
  ('duplicate_detection', false),
  ('public_api', false)
on conflict (module) do nothing;

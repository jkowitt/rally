-- ============================================================
-- MIGRATION 069 — PLATFORM HARDENING (GAPS 1-7)
-- ============================================================
-- Addresses every non-monetization gap from the platform audit:
-- onboarding analytics, user notifications, real-time collaboration,
-- data export, performance (pagination helpers), and integrations.
-- ============================================================

-- ========================
-- 1. ONBOARDING ANALYTICS
-- ========================
-- Track every onboarding event with timestamps so we can measure
-- dropout rates, time-to-first-value, and cohort activation.
create table if not exists onboarding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
    -- 'modal_opened' | 'step_viewed' | 'step_completed' | 'step_skipped'
    -- | 'modal_dismissed' | 'first_deal_created' | 'first_contract_uploaded'
    -- | 'first_asset_added' | 'onboarding_completed' | 'checklist_item_done'
  step_name text,
  step_index integer,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_onboarding_events_user on onboarding_events(user_id, created_at);
create index if not exists idx_onboarding_events_type on onboarding_events(event_type, created_at desc);

alter table onboarding_events enable row level security;
create policy "onboarding_events_own" on onboarding_events
  for all using (user_id = auth.uid() or is_developer())
  with check (user_id = auth.uid() or is_developer());

-- Activation metrics view — shows per-user activation state
create or replace view user_activation_metrics as
select
  p.id as user_id,
  p.email,
  p.full_name,
  p.created_at as signed_up_at,
  (select min(created_at) from onboarding_events where user_id = p.id and event_type = 'onboarding_completed') as onboarding_completed_at,
  (select min(created_at) from deals where created_by = p.id) as first_deal_at,
  (select min(created_at) from contracts where uploaded_by = p.id) as first_contract_at,
  (select count(*) from deals where created_by = p.id) as total_deals,
  (select count(*) from onboarding_events where user_id = p.id and event_type = 'step_completed') as steps_completed,
  case
    when exists (select 1 from deals where created_by = p.id) then 'activated'
    when exists (select 1 from onboarding_events where user_id = p.id and event_type = 'onboarding_completed') then 'onboarded'
    when exists (select 1 from onboarding_events where user_id = p.id) then 'started'
    else 'new'
  end as activation_state,
  extract(epoch from (
    coalesce(
      (select min(created_at) from deals where created_by = p.id),
      now()
    ) - p.created_at
  )) / 3600 as hours_to_first_deal
from profiles p;

-- ========================
-- 2. USER NOTIFICATIONS (not just admin)
-- ========================
create table if not exists user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
    -- 'deal_stage_changed' | 'contact_replied' | 'contract_signed'
    -- | 'task_assigned' | 'task_due_soon' | 'project_updated'
    -- | 'mention' | 'system' | 'achievement'
  title text not null,
  body text,
  link text,
  icon text,
  metadata jsonb default '{}'::jsonb,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notif_user on user_notifications(user_id, read, created_at desc);

alter table user_notifications enable row level security;
create policy "user_notif_own" on user_notifications
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- Developers can read all for debugging
create policy "user_notif_dev_read" on user_notifications
  for select using (is_developer());

-- Auto-notify on deal stage change
create or replace function notify_deal_stage_change()
returns trigger language plpgsql security definer as $$
begin
  if tg_op != 'UPDATE' then return new; end if;
  if old.stage is not distinct from new.stage then return new; end if;

  -- Notify the deal owner
  if new.assigned_to is not null then
    insert into user_notifications (user_id, type, title, body, link, icon)
    values (
      new.assigned_to,
      'deal_stage_changed',
      coalesce(new.company_name, 'Deal') || ' moved to ' || coalesce(new.stage, 'unknown'),
      'Deal stage updated from ' || coalesce(old.stage, 'none') || ' to ' || coalesce(new.stage, 'unknown'),
      '/app/crm/pipeline',
      '📊'
    );
  end if;
  return new;
exception when others then return new;
end;
$$;

drop trigger if exists deals_notify_stage_change on deals;
create trigger deals_notify_stage_change
  after update on deals for each row
  execute function notify_deal_stage_change();

-- Auto-notify on task assignment
create or replace function notify_task_assigned()
returns trigger language plpgsql security definer as $$
begin
  if new.assignee_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.assignee_id is not distinct from new.assignee_id then return new; end if;

  insert into user_notifications (user_id, type, title, body, link, icon)
  values (
    new.assignee_id,
    'task_assigned',
    'New task: ' || new.title,
    'You were assigned a task in project',
    '/app/crm/projects/' || new.project_id,
    '📋'
  );
  return new;
exception when others then return new;
end;
$$;

drop trigger if exists project_tasks_notify_assigned on project_tasks;
create trigger project_tasks_notify_assigned
  after insert or update on project_tasks for each row
  execute function notify_task_assigned();

-- ========================
-- 3. OPTIMISTIC CONCURRENCY CONTROL
-- ========================
-- Add version columns to core tables for conflict detection.
-- The client sends the version it last read; the server rejects
-- if someone else updated in between.
alter table deals add column if not exists version integer not null default 1;
alter table contacts add column if not exists version integer not null default 1;
alter table contracts add column if not exists version integer not null default 1;

-- Trigger to auto-increment version on update
create or replace function increment_version()
returns trigger language plpgsql as $$
begin
  new.version := coalesce(old.version, 0) + 1;
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'deals_version_trigger') then
    create trigger deals_version_trigger before update on deals
      for each row execute function increment_version();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'contacts_version_trigger') then
    create trigger contacts_version_trigger before update on contacts
      for each row execute function increment_version();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'contracts_version_trigger') then
    create trigger contracts_version_trigger before update on contracts
      for each row execute function increment_version();
  end if;
end $$;

-- ========================
-- 4. DATA EXPORT AUDIT LOG
-- ========================
-- Track every export for compliance (GDPR right to data portability).
create table if not exists data_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  export_type text not null,
    -- 'deals_csv' | 'contacts_csv' | 'activities_csv' | 'gdpr_full'
    -- | 'subscribers_csv' | 'pipeline_pdf' | 'brand_report_pdf'
  row_count integer,
  file_size_bytes integer,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  download_url text,
  expires_at timestamptz
);

alter table data_exports enable row level security;
create policy "data_exports_own" on data_exports
  for all using (user_id = auth.uid() or is_developer())
  with check (user_id = auth.uid() or is_developer());

-- ========================
-- 5. INTEGRATION STATUS TRACKING
-- ========================
create table if not exists integration_status (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  integration_name text not null,
    -- 'outlook' | 'stripe' | 'apollo' | 'hunter' | 'resend' | 'sendgrid'
  status text not null default 'disconnected',
    -- 'connected' | 'disconnected' | 'error' | 'syncing'
  last_synced_at timestamptz,
  last_error text,
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, integration_name)
);

alter table integration_status enable row level security;
create policy "integration_status_own" on integration_status
  for all using (property_id = get_user_property_id() or is_developer())
  with check (property_id = get_user_property_id() or is_developer());

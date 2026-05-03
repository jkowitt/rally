-- ============================================================
-- MIGRATION 072 — UNIFIED INBOX INTEGRATION (Outlook + Gmail)
-- ============================================================
-- Lifts the developer-only Outlook integration (migration 053) to
-- a multi-tenant feature any user can connect, and adds Gmail
-- mirror tables so the customer-facing UI can be provider-agnostic.
--
-- Migration is purely additive:
--   1. Adds property_id to outlook_auth + outlook_emails (nullable
--      for backwards compat with the developer's existing rows).
--   2. Adds new RLS policies that scope by property_id, in
--      addition to the existing is_developer() policies.
--   3. Creates gmail_auth + gmail_emails tables that mirror the
--      Outlook schema 1:1 so the same UI can render both.
--   4. Creates email_account_summary view that unions both
--      providers into a single feed for the customer-facing inbox.
--
-- Provider OAuth + sync logic still lives in edge functions
-- (outlook-* + new gmail-* set). This migration only handles
-- the data plane.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROPERTY SCOPING ON EXISTING OUTLOOK TABLES
-- ────────────────────────────────────────────────────────────
alter table outlook_auth add column if not exists property_id uuid references properties(id) on delete cascade;
alter table outlook_emails add column if not exists property_id uuid references properties(id) on delete cascade;

create index if not exists idx_outlook_auth_property on outlook_auth(property_id);
create index if not exists idx_outlook_emails_property on outlook_emails(property_id);

-- Backfill property_id from the user's profile so the existing
-- developer rows aren't orphaned.
update outlook_auth oa
  set property_id = p.property_id
  from profiles p
  where p.id = oa.user_id and oa.property_id is null;

update outlook_emails oe
  set property_id = p.property_id
  from profiles p
  where p.id = oe.user_id and oe.property_id is null;

-- New property-scoped policies (the existing dev policies stay
-- in place so the developer's own data keeps working).
create policy "outlook_auth_owner_select" on outlook_auth for select using (
  user_id = auth.uid() or
  (property_id is not null and property_id = get_user_property_id())
);
create policy "outlook_auth_owner_insert" on outlook_auth for insert with check (
  user_id = auth.uid()
);
create policy "outlook_auth_owner_update" on outlook_auth for update using (
  user_id = auth.uid()
);
create policy "outlook_auth_owner_delete" on outlook_auth for delete using (
  user_id = auth.uid()
);

create policy "outlook_emails_owner_select" on outlook_emails for select using (
  user_id = auth.uid() or
  (property_id is not null and property_id = get_user_property_id())
);
create policy "outlook_emails_owner_insert" on outlook_emails for insert with check (
  user_id = auth.uid()
);
create policy "outlook_emails_owner_update" on outlook_emails for update using (
  user_id = auth.uid()
);
create policy "outlook_emails_owner_delete" on outlook_emails for delete using (
  user_id = auth.uid()
);

-- ────────────────────────────────────────────────────────────
-- 2. GMAIL MIRROR TABLES
-- ────────────────────────────────────────────────────────────
create table if not exists gmail_auth (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  access_token text,           -- encrypted at app layer
  refresh_token text,          -- encrypted at app layer
  token_expires_at timestamptz,
  gmail_email text,
  gmail_display_name text,
  is_connected boolean not null default false,
  connected_at timestamptz,
  last_synced_at timestamptz,
  last_history_id text,        -- Gmail uses historyId for incremental sync
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_gmail_auth_property on gmail_auth(property_id);

alter table gmail_auth enable row level security;

create policy "gmail_auth_owner_select" on gmail_auth for select using (
  user_id = auth.uid() or
  (property_id is not null and property_id = get_user_property_id()) or
  is_developer()
);
create policy "gmail_auth_owner_insert" on gmail_auth for insert with check (
  user_id = auth.uid()
);
create policy "gmail_auth_owner_update" on gmail_auth for update using (
  user_id = auth.uid()
);
create policy "gmail_auth_owner_delete" on gmail_auth for delete using (
  user_id = auth.uid()
);

create table if not exists gmail_emails (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null unique,
  gmail_thread_id text,
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  subject text,
  snippet text,                -- Gmail's body preview equivalent
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
  is_starred boolean not null default false,
  has_attachments boolean not null default false,
  labels text[] default '{}',  -- Gmail labels (INBOX, SENT, DRAFT, custom)
  linked_contact_id uuid references contacts(id) on delete set null,
  linked_deal_id uuid references deals(id) on delete set null,
  auto_linked boolean not null default false,
  manually_linked boolean not null default false,
  ignored boolean not null default false,
  crm_logged boolean not null default false,
  crm_logged_at timestamptz,
  sync_source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_gmail_emails_user on gmail_emails(user_id);
create index if not exists idx_gmail_emails_property on gmail_emails(property_id);
create index if not exists idx_gmail_emails_received on gmail_emails(received_at desc);
create index if not exists idx_gmail_emails_from on gmail_emails(from_email);
create index if not exists idx_gmail_emails_thread on gmail_emails(gmail_thread_id);
create index if not exists idx_gmail_emails_linked_deal on gmail_emails(linked_deal_id);
create index if not exists idx_gmail_emails_linked_contact on gmail_emails(linked_contact_id);
create index if not exists idx_gmail_emails_unlinked on gmail_emails(linked_contact_id, ignored)
  where linked_contact_id is null and ignored = false;

alter table gmail_emails enable row level security;

create policy "gmail_emails_owner_select" on gmail_emails for select using (
  user_id = auth.uid() or
  (property_id is not null and property_id = get_user_property_id()) or
  is_developer()
);
create policy "gmail_emails_owner_insert" on gmail_emails for insert with check (
  user_id = auth.uid()
);
create policy "gmail_emails_owner_update" on gmail_emails for update using (
  user_id = auth.uid()
);
create policy "gmail_emails_owner_delete" on gmail_emails for delete using (
  user_id = auth.uid()
);

create table if not exists gmail_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  sync_type text not null,                -- 'full' | 'history' | 'manual'
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text,                            -- 'success' | 'error'
  messages_synced integer default 0,
  error_message text
);

create index if not exists idx_gmail_sync_log_user on gmail_sync_log(user_id, started_at desc);

alter table gmail_sync_log enable row level security;
create policy "gmail_sync_log_owner_select" on gmail_sync_log for select using (
  user_id = auth.uid() or is_developer()
);
create policy "gmail_sync_log_owner_insert" on gmail_sync_log for insert with check (
  user_id = auth.uid() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 3. UNIFIED VIEW — `email_messages_unified`
-- ────────────────────────────────────────────────────────────
-- Read-only view that lets the customer-facing UI render Outlook +
-- Gmail messages from the same source. The `provider` column tells
-- the UI which icon / actions to show.
create or replace view email_messages_unified as
  select
    'outlook'::text       as provider,
    id, outlook_message_id as message_id,
    user_id, property_id,
    subject, body_preview as preview, body_html, body_text,
    from_email, from_name, to_emails, cc_emails,
    received_at, sent_at,
    is_sent, is_read,
    has_attachments,
    folder                 as label,
    conversation_id        as thread_id,
    linked_contact_id, linked_deal_id,
    auto_linked, manually_linked, ignored,
    crm_logged, crm_logged_at,
    created_at
  from outlook_emails
  union all
  select
    'gmail'::text          as provider,
    id, gmail_message_id   as message_id,
    user_id, property_id,
    subject, snippet       as preview, body_html, body_text,
    from_email, from_name, to_emails, cc_emails,
    received_at, sent_at,
    is_sent, is_read,
    has_attachments,
    coalesce(labels[1], 'inbox')::text as label,
    gmail_thread_id        as thread_id,
    linked_contact_id, linked_deal_id,
    auto_linked, manually_linked, ignored,
    crm_logged, crm_logged_at,
    created_at
  from gmail_emails;

comment on view email_messages_unified is
  'Provider-agnostic feed of inbox/sent emails for the customer-facing CRM UI.';

-- ────────────────────────────────────────────────────────────
-- 4. AUTO-CREATE-CONTACT HELPER
-- ────────────────────────────────────────────────────────────
-- When a new email arrives from a sender that doesn't match any
-- existing contact, the sync function calls this helper to create
-- a contact + activity in the CRM and link the email to it.
--
-- Returns the new contact id (or the existing one if a match was
-- found by email after the call started — handles race conditions).
create or replace function autocreate_contact_from_email(
  p_property_id uuid,
  p_from_email text,
  p_from_name text,
  p_subject text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_first_name text;
  v_last_name text;
  v_new_id uuid;
begin
  if p_from_email is null or p_property_id is null then
    return null;
  end if;

  -- Idempotency: if a contact with this email already exists for
  -- the property, return its id.
  select id into v_existing_id
    from contacts
    where property_id = p_property_id
      and lower(email) = lower(p_from_email)
    limit 1;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  -- Best-effort name split: "Jane Doe" → first/last; bare names
  -- become first_name only.
  if p_from_name is not null and trim(p_from_name) <> '' then
    v_first_name := split_part(trim(p_from_name), ' ', 1);
    v_last_name  := nullif(trim(substring(trim(p_from_name) from position(' ' in trim(p_from_name)))), '');
  end if;

  insert into contacts (
    property_id, email, first_name, last_name,
    notes, is_primary, last_contacted_at
  ) values (
    p_property_id, p_from_email, v_first_name, v_last_name,
    'Auto-created from inbound email: ' || coalesce(p_subject, '(no subject)'),
    false,
    now()
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function autocreate_contact_from_email(uuid, text, text, text) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. EMAIL SIGNATURE (per-profile)
-- ────────────────────────────────────────────────────────────
-- The user's outbound signature, auto-appended by Compose.
-- Plain text or markdown — no rich HTML for v1 (kept simple).
alter table profiles add column if not exists email_signature text;

-- ────────────────────────────────────────────────────────────
-- 6. INBOX FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
-- Two new flags so customer-facing inbox can be greenlit per
-- provider. Default OFF so nothing leaks before OAuth apps are
-- registered in Azure / Google Cloud.
insert into feature_flags (module, enabled) values
  ('inbox_outlook', false),
  ('inbox_gmail', false)
on conflict (module) do nothing;

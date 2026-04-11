-- ============================================================
-- MIGRATION 056 — BULK CONTRACT MIGRATION SYSTEM
-- ============================================================
-- Adds four tables for tracking multi-contract upload sessions,
-- individual file processing state, extracted benefits (pre-review),
-- and sponsor duplicate resolution.
--
-- All writes flow into existing contacts / deals / contracts /
-- assets / fulfillment_records tables during finalization.
-- ============================================================

-- ========================
-- 1. MIGRATION SESSIONS
-- ========================
create table if not exists contract_migration_sessions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'uploading',
    -- 'uploading' | 'processing' | 'review' | 'complete' | 'failed'
  total_contracts integer not null default 0,
  contracts_processed integer not null default 0,
  contracts_complete integer not null default 0,
  contracts_failed integer not null default 0,
  total_benefits_extracted integer not null default 0,
  benefits_auto_matched integer not null default 0,
  benefits_needs_review integer not null default 0,
  benefits_approved integer not null default 0,
  sponsors_created integer not null default 0,
  deals_created integer not null default 0,
  fulfillment_records_created integer not null default 0,
  duplicate_sponsors_merged integer not null default 0,
  duplicate_assets_prevented integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_migration_sessions_property on contract_migration_sessions(property_id);
create index if not exists idx_migration_sessions_status on contract_migration_sessions(status);

alter table contract_migration_sessions enable row level security;

create policy "migration_sessions_select" on contract_migration_sessions
  for select using (is_developer() or property_id = get_user_property_id());
create policy "migration_sessions_insert" on contract_migration_sessions
  for insert with check (property_id = get_user_property_id());
create policy "migration_sessions_update" on contract_migration_sessions
  for update using (is_developer() or property_id = get_user_property_id());
create policy "migration_sessions_delete" on contract_migration_sessions
  for delete using (is_developer() or property_id = get_user_property_id());

-- ========================
-- 2. MIGRATION FILES
-- ========================
create table if not exists contract_migration_files (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references contract_migration_sessions(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  original_filename text not null,
  storage_path text,       -- path in supabase storage bucket
  file_url text,           -- public or signed URL
  file_type text,          -- 'pdf' | 'docx'
  file_size_bytes integer,
  status text not null default 'queued',
    -- 'queued' | 'uploading' | 'processing' | 'complete' | 'failed' | 'retrying'
  retry_count integer not null default 0,
  error_message text,
  extracted_data jsonb,    -- raw AI response (subject, dates, sponsor, benefits[])
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_migration_files_session on contract_migration_files(session_id);
create index if not exists idx_migration_files_status on contract_migration_files(status);

alter table contract_migration_files enable row level security;

create policy "migration_files_all" on contract_migration_files
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 3. MIGRATION BENEFITS (pre-review)
-- ========================
create table if not exists contract_migration_benefits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references contract_migration_sessions(id) on delete cascade,
  file_id uuid not null references contract_migration_files(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  benefit_name text not null,
  benefit_category text,
  frequency text,
  quantity integer default 1,
  unit_value numeric,
  annual_value numeric,
  total_value numeric,
  extracted_confidence numeric default 0,  -- 0-100
  review_status text not null default 'pending',
    -- 'pending' | 'approved' | 'edited' | 'rejected'
  asset_match_id uuid references assets(id) on delete set null,
  asset_match_confidence numeric default 0,
  asset_match_status text,
    -- 'auto_matched' | 'manually_matched' | 'new_asset' | 'rejected'
  final_benefit_name text,
  final_category text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_migration_benefits_session on contract_migration_benefits(session_id);
create index if not exists idx_migration_benefits_file on contract_migration_benefits(file_id);
create index if not exists idx_migration_benefits_review on contract_migration_benefits(review_status);

alter table contract_migration_benefits enable row level security;

create policy "migration_benefits_all" on contract_migration_benefits
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 4. MIGRATION SPONSORS (duplicate resolution)
-- ========================
create table if not exists contract_migration_sponsors (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references contract_migration_sessions(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  extracted_name text,
  extracted_email text,
  extracted_phone text,
  extracted_company text,
  extracted_contact_person text,
  contract_file_ids uuid[] default '{}',
  duplicate_of_contact_id uuid references contacts(id) on delete set null,
  merge_status text not null default 'new',
    -- 'new' | 'merged' | 'conflict'
  conflict_fields jsonb,
  final_contact_id uuid references contacts(id) on delete set null,
  review_status text not null default 'pending',
    -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz not null default now()
);

create index if not exists idx_migration_sponsors_session on contract_migration_sponsors(session_id);

alter table contract_migration_sponsors enable row level security;

create policy "migration_sponsors_all" on contract_migration_sponsors
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ============================================================
-- DONE
-- ============================================================

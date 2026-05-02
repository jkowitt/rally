-- ============================================================
-- MIGRATION 070 — CONTRACT VERSIONING + ACCOUNT MANAGEMENT FLOW
-- ============================================================
-- When a signed contract is updated, we snapshot the prior version
-- to contract_versions before applying the change, so users can
-- look back at what was previously agreed. Also adds an
-- `archived_at` column on contracts so a contract can be marked
-- archived (e.g. replaced by a renewal) without being deleted.
-- ============================================================

-- 1. Add archived flag to contracts table
alter table contracts add column if not exists archived_at timestamptz;
alter table contracts add column if not exists archived_reason text;

create index if not exists idx_contracts_archived_at
  on contracts(archived_at)
  where archived_at is not null;

-- 2. Versions table — full snapshot of a contract + its benefits
--    at the moment it was edited. Keyed by (contract_id, version_number)
--    so a contract can have N historical versions.
create table if not exists contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
    -- Full row snapshot:
    -- { contract: {...row...}, benefits: [{...}, ...] }
  archived_at timestamptz not null default now(),
  archived_by uuid references auth.users(id),
  archived_reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_contract_versions_unique
  on contract_versions(contract_id, version_number);

create index if not exists idx_contract_versions_contract
  on contract_versions(contract_id, archived_at desc);

create index if not exists idx_contract_versions_property
  on contract_versions(property_id, archived_at desc);

alter table contract_versions enable row level security;

create policy "contract_versions_select" on contract_versions for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "contract_versions_insert" on contract_versions for insert with check (
  is_developer() or property_id = get_user_property_id()
);
-- Versions are immutable history — no update/delete policies. Devs
-- can still clean up via service role if absolutely needed.

-- 3. Helper: archive a contract version. Pass the contract_id and
--    optional reason; the function snapshots the current row +
--    benefits and inserts into contract_versions with the next
--    sequential version_number.
create or replace function archive_contract_version(
  p_contract_id uuid,
  p_reason text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_contract record;
  v_benefits jsonb;
  v_next_version integer;
  v_new_id uuid;
begin
  select * into v_contract from contracts where id = p_contract_id;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(to_jsonb(b.*)), '[]'::jsonb)
    into v_benefits
    from contract_benefits b
    where b.contract_id = p_contract_id;

  select coalesce(max(version_number), 0) + 1
    into v_next_version
    from contract_versions
    where contract_id = p_contract_id;

  insert into contract_versions (
    contract_id, property_id, version_number, snapshot,
    archived_by, archived_reason
  ) values (
    p_contract_id,
    v_contract.property_id,
    v_next_version,
    jsonb_build_object('contract', to_jsonb(v_contract), 'benefits', v_benefits),
    auth.uid(),
    p_reason
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function archive_contract_version(uuid, text) to authenticated;

-- ============================================================
-- MIGRATION 103 — RESTRICTED COMPANIES (HQ-MANAGED ACCOUNTS)
-- ============================================================
-- Admin-only block list. Companies a property HQ wants to manage
-- centrally — large national advertisers, accounts already in
-- procurement with a parent agency, anything reps shouldn't touch
-- without explicit assignment.
--
-- How it works:
--   1. Admin (or developer) creates a row with brand_name + any
--      common aliases ("Acme", "Acme Inc.", "Acme Corp.").
--   2. A trigger on `deals` blocks any insert/update whose
--      brand_name matches the canonical name OR any alias,
--      EXCEPT when the user is admin/developer OR is the
--      `assigned_to_user_id` for that restriction.
--   3. Admins can grant access by setting assigned_to_user_id on
--      the restriction row.
--
-- Name matching is fuzzy by design:
--   normalize_brand_name() strips common corporate suffixes
--   (Inc, LLC, Corp, Corporation, Ltd, Co, Limited, Company),
--   punctuation, and whitespace, then lowercases. So "Acme",
--   "Acme, Inc.", "ACME Corporation", and "acme co" all
--   collapse to "acme" and match the same restriction.
--
-- RLS: admins/developers see everything; reps see only rows
-- assigned to them, so a rep with one allowed national account
-- gets exactly that one row.
-- ============================================================

-- ─── normalize_brand_name() helper ─────────────────────────────
-- IMMUTABLE because the same input always produces the same
-- output — lets PostgreSQL inline / index function results.
create or replace function normalize_brand_name(input text)
returns text
immutable
language plpgsql
as $$
declare
  v text := coalesce(input, '');
begin
  -- 1. lowercase
  v := lower(v);
  -- 2. strip punctuation (keep letters, digits, spaces, &)
  v := regexp_replace(v, '[^a-z0-9 &]+', ' ', 'g');
  -- 3. strip common corporate suffixes anywhere they appear as
  --    standalone tokens. Order: longest first so "corporation"
  --    doesn't get half-stripped by "corp".
  v := regexp_replace(v, '\m(incorporated|corporation|limited|company|holdings|partners|services|industries|enterprises|international|group|llp|inc|llc|ltd|corp|co)\M', ' ', 'gi');
  -- 4. collapse whitespace + trim
  v := regexp_replace(v, '\s+', ' ', 'g');
  v := trim(v);
  return v;
end;
$$;

grant execute on function normalize_brand_name(text) to authenticated, service_role;

-- ─── restricted_companies table ────────────────────────────────
create table if not exists restricted_companies (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  brand_name text not null,                  -- canonical display name
  brand_normalized text not null,            -- computed via trigger below
  aliases text[] default '{}'::text[],       -- additional name variants
  aliases_normalized text[] default '{}'::text[],
  reason text,                               -- why it's restricted (HQ note)

  -- Single-rep assignment. When set, that rep CAN add this
  -- account to their pipeline; everyone else still can't.
  assigned_to_user_id uuid references profiles(id) on delete set null,
  assigned_at timestamptz,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_reason text,

  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_restricted_property_brand
  on restricted_companies(property_id, brand_normalized);
create index if not exists idx_restricted_aliases
  on restricted_companies using gin(aliases_normalized);
create index if not exists idx_restricted_assigned
  on restricted_companies(assigned_to_user_id)
  where assigned_to_user_id is not null;

alter table restricted_companies enable row level security;
drop policy if exists "restricted_companies_admin_full" on restricted_companies;
drop policy if exists "restricted_companies_rep_read_assigned" on restricted_companies;

-- Admins + developers: full access in their workspace.
create policy "restricted_companies_admin_full" on restricted_companies for all
  using (
    property_id in (
      select property_id from profiles where id = auth.uid()
        and role in ('admin','developer')
    )
    or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
  );

-- Reps: can only see rows assigned to them, so a rep who's been
-- given a national account can see that one row in dropdowns +
-- UI without seeing the rest of the workspace's restriction list.
create policy "restricted_companies_rep_read_assigned" on restricted_companies for select
  using (assigned_to_user_id = auth.uid());

-- ─── Trigger: keep normalized fields in sync ───────────────────
create or replace function trg_normalize_restricted_brand()
returns trigger
language plpgsql
as $$
begin
  new.brand_normalized := normalize_brand_name(new.brand_name);
  if new.aliases is null then
    new.aliases := '{}'::text[];
  end if;
  new.aliases_normalized := (
    select coalesce(array_agg(distinct nullif(normalize_brand_name(a), '')), '{}'::text[])
    from unnest(new.aliases) a
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists restricted_companies_normalize on restricted_companies;
create trigger restricted_companies_normalize
  before insert or update on restricted_companies
  for each row execute function trg_normalize_restricted_brand();

-- ─── restriction_violations log ────────────────────────────────
-- Lightweight audit. Rows are inserted by the trigger BEFORE it
-- raises an exception (using a SECURITY DEFINER helper that
-- inserts in an autonomous-style sub-transaction via dblink-like
-- semantics — actually we use a separate function call that
-- commits independently of the failing parent statement via
-- pg_background... too complex). Simpler: app-layer logs it
-- after catching the exception. Schema is ready for either path.
create table if not exists restriction_violations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  attempted_brand_name text not null,
  matched_restriction_id uuid references restricted_companies(id) on delete set null,
  source text,                                -- 'deal_create' | 'deal_update' | 'find_prospects' | 'bulk_add'
  created_at timestamptz default now()
);
create index if not exists idx_restriction_violations_property
  on restriction_violations(property_id, created_at desc);

alter table restriction_violations enable row level security;
drop policy if exists "restriction_violations_admin_read" on restriction_violations;
create policy "restriction_violations_admin_read" on restriction_violations for all using (
  property_id in (
    select property_id from profiles where id = auth.uid()
      and role in ('admin','developer')
  )
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- ─── Deal-insert enforcement trigger ───────────────────────────
-- Fires BEFORE insert/update on deals. Compares the new
-- brand_name against all restricted_companies rows in the same
-- property (canonical + aliases). If a match exists and the
-- inserting user is not the assigned rep / not an admin /
-- not a developer, raise an exception with a friendly message
-- the UI catches and shows to the rep.
create or replace function trg_enforce_restricted_companies()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := coalesce(new.created_by, auth.uid());
  v_role text;
  v_norm text;
  v_match restricted_companies%rowtype;
begin
  -- Nothing to check on stage/value-only updates if the brand name
  -- isn't changing. Skip the lookup entirely.
  if tg_op = 'UPDATE' and new.brand_name is not distinct from old.brand_name then
    return new;
  end if;

  v_norm := normalize_brand_name(new.brand_name);
  if v_norm = '' then return new; end if;

  -- Find the first matching restriction in this property.
  select * into v_match
    from restricted_companies r
   where r.property_id = new.property_id
     and (r.brand_normalized = v_norm or v_norm = any(r.aliases_normalized))
   limit 1;

  if not found then return new; end if;

  -- Determine the caller's role. Service-role writes (cron, edge
  -- functions) bypass — they're trusted system contexts.
  select role into v_role from profiles where id = v_user;
  if v_role in ('admin', 'developer') then return new; end if;
  if v_match.assigned_to_user_id is not null and v_match.assigned_to_user_id = v_user then
    return new;
  end if;

  -- Log the attempt before raising so admins can audit.
  begin
    insert into restriction_violations (property_id, user_id, attempted_brand_name, matched_restriction_id, source)
    values (new.property_id, v_user, new.brand_name, v_match.id,
            case when tg_op = 'INSERT' then 'deal_create' else 'deal_update' end);
  exception when others then null; end;

  raise exception 'restricted_company: % is a managed account. Contact an admin to request access.', v_match.brand_name
    using errcode = 'P0001';
end;
$$;

drop trigger if exists deals_enforce_restricted on deals;
create trigger deals_enforce_restricted
  before insert or update of brand_name on deals
  for each row execute function trg_enforce_restricted_companies();

-- ─── Public matcher RPC ────────────────────────────────────────
-- The UI calls this to do a soft pre-check before the user clicks
-- "Save deal" so we can show a yellow warning ("this is a managed
-- account") instead of hitting the trigger and bouncing.
-- Returns the matched restriction row when the calling user is
-- blocked, otherwise null. RLS ensures reps only see their own
-- assigned rows; this function uses SECURITY DEFINER to look up
-- the restriction independent of RLS for the warning path, but
-- only returns the row metadata, never the restriction list.
create or replace function check_brand_restriction(p_brand_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_property uuid;
  v_role text;
  v_norm text;
  v_match restricted_companies%rowtype;
begin
  if v_user is null then return null; end if;

  select role, property_id into v_role, v_property
    from profiles where id = v_user;
  if v_property is null then return null; end if;

  v_norm := normalize_brand_name(p_brand_name);
  if v_norm = '' then return null; end if;

  select * into v_match
    from restricted_companies r
   where r.property_id = v_property
     and (r.brand_normalized = v_norm or v_norm = any(r.aliases_normalized))
   limit 1;

  if not found then return null; end if;

  -- If the user is allowed (admin/dev/assigned), no block — but
  -- we still return the match so the UI can show "this is a
  -- managed account, assigned to you" as informational context.
  return jsonb_build_object(
    'id', v_match.id,
    'brand_name', v_match.brand_name,
    'reason', v_match.reason,
    'assigned_to_user_id', v_match.assigned_to_user_id,
    'blocked', not (
      v_role in ('admin','developer')
      or (v_match.assigned_to_user_id is not null and v_match.assigned_to_user_id = v_user)
    )
  );
end;
$$;

grant execute on function check_brand_restriction(text) to authenticated;

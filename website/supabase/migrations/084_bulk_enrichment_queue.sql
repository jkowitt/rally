-- ============================================================
-- MIGRATION 084 — BULK ENRICHMENT QUEUE
-- ============================================================
-- Lets a user paste a list of companies / prospects (or upload a
-- CSV) and have them sit in a queue for later enrichment. The
-- queue runner reads each row and looks up firmographics + people
-- via either Apollo (token-based, accurate) or Claude (free, uses
-- general knowledge — less reliable but no out-of-pocket cost).
--
-- Materialization (turning a queued row into a real contact or
-- deal) is a separate step the user triggers after they review
-- enriched results. Keeping the queue distinct from contacts /
-- deals avoids polluting the CRM with un-vetted data.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENRICHMENT QUEUE
-- ────────────────────────────────────────────────────────────
create table if not exists enrichment_queue (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  -- Source: 'paste' | 'csv' | 'api' (which path produced this row)
  source text not null default 'paste',
  -- Kind: what the row represents.
  kind text not null check (kind in ('company', 'contact')),
  -- raw_input — the actual line/row the user submitted, kept verbatim
  -- so we can re-parse if normalization rules change.
  raw_input text,
  -- Normalized hint fields. The runner fills these from raw_input
  -- before calling enrichment APIs.
  brand_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  linkedin_url text,
  notes text,
  -- Enrichment mode the user picked at submit time.
  enrichment_mode text not null default 'claude'
    check (enrichment_mode in ('apollo', 'claude', 'hybrid', 'none')),
  -- Status lifecycle.
  status text not null default 'pending'
    check (status in ('pending', 'enriching', 'enriched', 'failed', 'cancelled', 'materialized')),
  attempt_count integer not null default 0,
  last_error text,
  -- Output of enrichment — full structure depends on the mode.
  enriched_data jsonb default '{}'::jsonb,
  enriched_at timestamptz,
  -- After the user clicks "Add to pipeline", these point at the
  -- materialized contact / deal so we don't double-create.
  materialized_contact_id uuid references contacts(id) on delete set null,
  materialized_deal_id uuid references deals(id) on delete set null,
  materialized_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_enrichment_queue_property on enrichment_queue(property_id, created_at desc);
create index if not exists idx_enrichment_queue_pending on enrichment_queue(property_id, status)
  where status in ('pending', 'enriching');
create index if not exists idx_enrichment_queue_runner on enrichment_queue(status, created_at)
  where status = 'pending';

alter table enrichment_queue enable row level security;
create policy "enrichment_queue_property_all" on enrichment_queue for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 2. BULK INSERT RPC (so the frontend can submit hundreds of
-- rows in a single round-trip without hitting per-row triggers
-- repeatedly).
-- ────────────────────────────────────────────────────────────
create or replace function bulk_enqueue_for_enrichment(
  p_property_id uuid,
  p_rows jsonb,                                 -- array of row objects
  p_source text default 'paste',
  p_enrichment_mode text default 'claude'
) returns table(inserted integer)
language plpgsql security invoker set search_path = public as $$
declare
  v_count integer := 0;
  rec jsonb;
begin
  if p_property_id is null or p_rows is null then
    return query select 0;
    return;
  end if;
  for rec in select * from jsonb_array_elements(p_rows) loop
    insert into enrichment_queue (
      property_id, created_by, source, kind, raw_input,
      brand_name, contact_name, contact_email, contact_phone,
      website, linkedin_url, notes, enrichment_mode
    ) values (
      p_property_id,
      auth.uid(),
      p_source,
      coalesce(rec->>'kind', 'company'),
      rec->>'raw_input',
      rec->>'brand_name',
      rec->>'contact_name',
      rec->>'contact_email',
      rec->>'contact_phone',
      rec->>'website',
      rec->>'linkedin_url',
      rec->>'notes',
      p_enrichment_mode
    );
    v_count := v_count + 1;
  end loop;
  return query select v_count;
end;
$$;

grant execute on function bulk_enqueue_for_enrichment(uuid, jsonb, text, text) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. FEATURE FLAG
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('bulk_enrichment', true)
on conflict (module) do nothing;

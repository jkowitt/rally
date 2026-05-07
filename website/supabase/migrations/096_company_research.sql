-- ============================================================
-- MIGRATION 096 — COMPANY RESEARCH CACHE
-- ============================================================
-- Backs the new /functions/v1/company-research edge function.
-- Caches Claude + web_search results so we don't re-spend tokens
-- looking up the same company twice. Per-property scoping keeps
-- the cache aligned with RLS.
--
-- A company can also be linked to a specific deal — when a rep
-- runs research from a deal drawer we update deals.industry /
-- deals.website / deals.notes inline AND cache the full payload
-- here for re-display.
-- ============================================================

create table if not exists company_research (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,

  -- Inputs
  company_name text not null,
  domain text,

  -- Outputs (all best-effort from public web sources)
  industry text,
  website text,
  description text,
  -- [{ name, title, linkedin_url?, source_url? }, …]
  leadership jsonb default '[]'::jsonb,
  -- [{ url, title, snippet }, …] — the web pages Claude pulled
  sources jsonb default '[]'::jsonb,

  -- Diagnostics for debugging bad results
  raw_response text,
  search_queries jsonb default '[]'::jsonb,

  researched_at timestamptz not null default now(),
  -- Cache TTL — 90 days. Refresh forces a re-research.
  expires_at timestamptz not null default (now() + interval '90 days'),
  researched_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),

  -- One canonical row per (property, normalized company name).
  -- Re-research updates the existing row in place via upsert.
  unique(property_id, company_name)
);

create index if not exists idx_company_research_property on company_research(property_id, researched_at desc);
create index if not exists idx_company_research_deal on company_research(deal_id) where deal_id is not null;
create index if not exists idx_company_research_expires on company_research(expires_at);

alter table company_research enable row level security;

create policy "company_research_property_access" on company_research
  for all using (
    property_id in (select property_id from profiles where id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
  );

-- Apollo.io + Hunter.io enrichment integration

-- Cache table for contact research (avoid re-fetching for 30 days)
create table if not exists contact_research (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  person_name text, -- null for company-level enrichment
  source text not null check (source in ('apollo', 'hunter', 'claude', 'manual')),
  data jsonb not null, -- full response payload
  fetched_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days'),
  property_id uuid references properties(id) on delete cascade
);

create index if not exists idx_contact_research_company on contact_research(lower(company_name));
create index if not exists idx_contact_research_person on contact_research(lower(person_name));
create index if not exists idx_contact_research_expires on contact_research(expires_at);

alter table contact_research enable row level security;
create policy "research_property_access" on contact_research for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- Email verification status on contacts
alter table contacts add column if not exists email_verified text check (email_verified in ('verified', 'invalid', 'risky', 'unknown')) default 'unknown';
alter table contacts add column if not exists email_verified_at timestamptz;
alter table contacts add column if not exists enriched_from text; -- 'apollo', 'claude', 'manual'
alter table contacts add column if not exists enriched_at timestamptz;

-- Company enrichment fields on deals (from Apollo firmographics)
alter table deals add column if not exists apollo_company_id text;
alter table deals add column if not exists apollo_enriched_at timestamptz;
alter table deals add column if not exists tech_stack text[]; -- array of technologies they use
alter table deals add column if not exists funding_stage text;
alter table deals add column if not exists recent_news jsonb; -- array of {title, url, date}
alter table deals add column if not exists buying_intent_score integer; -- 0-100 from Apollo intent signals
alter table deals add column if not exists annual_ad_spend numeric; -- estimated ad spend

-- API usage tracking for cost control
create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  service text not null check (service in ('apollo', 'hunter', 'claude')),
  endpoint text not null,
  credits_used integer default 1,
  called_at timestamptz default now()
);

create index if not exists idx_api_usage_property_date on api_usage(property_id, called_at desc);
create index if not exists idx_api_usage_service on api_usage(service, called_at desc);

alter table api_usage enable row level security;
create policy "api_usage_property_access" on api_usage for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

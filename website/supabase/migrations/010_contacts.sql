-- ============================================================
-- 010: Contacts table — multiple contacts per deal
--      + company enrichment fields on deals
-- ============================================================

create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  property_id uuid not null references properties(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  first_name text not null default '',
  last_name text,
  email text,
  phone text,
  position text,
  company text,
  city text,
  state text,
  linkedin text,
  website text,
  is_primary boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Index for fast lookups
create index if not exists idx_contacts_property on contacts(property_id);
create index if not exists idx_contacts_deal on contacts(deal_id);
create index if not exists idx_contacts_company on contacts(company);

-- RLS
alter table contacts enable row level security;

create policy "contacts_property_access" on contacts
  for all using (
    property_id in (
      select property_id from profiles
      where id = auth.uid()
    )
  );

create policy "contacts_developer_bypass" on contacts
  for all using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'developer'
    )
  );

-- Add company-level fields to deals for the enriched company data
alter table deals add column if not exists city text;
alter table deals add column if not exists state text;
alter table deals add column if not exists website text;
alter table deals add column if not exists linkedin text;
alter table deals add column if not exists founded text;
alter table deals add column if not exists revenue_thousands numeric;
alter table deals add column if not exists employees integer;
alter table deals add column if not exists sub_industry text;
alter table deals add column if not exists outreach_status text default 'Not Started';

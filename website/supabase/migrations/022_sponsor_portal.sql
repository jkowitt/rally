create table if not exists sponsor_portal_links (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  token text unique not null default gen_random_uuid()::text,
  created_by uuid references profiles(id),
  label text,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_sponsor_portal_token on sponsor_portal_links(token);
alter table sponsor_portal_links enable row level security;
create policy "portal_links_property_access" on sponsor_portal_links for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);
-- Public read access by token (no auth required)
create policy "portal_links_public_read" on sponsor_portal_links for select using (active = true);

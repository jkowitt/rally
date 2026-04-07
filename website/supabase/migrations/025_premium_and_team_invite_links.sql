-- Premium invite links (developer-generated, 48hr expiry)
create table if not exists premium_invite_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default gen_random_uuid()::text,
  plan text not null default 'pro' check (plan in ('starter', 'pro', 'enterprise')),
  label text, -- "NIU Athletics pilot", "Demo for NACDA"
  created_by uuid references profiles(id),
  claimed_by uuid references profiles(id),
  claimed_at timestamptz,
  property_id uuid references properties(id), -- set when claimed
  expires_at timestamptz not null default (now() + interval '48 hours'),
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_premium_invite_token on premium_invite_links(token);

alter table premium_invite_links enable row level security;
create policy "premium_links_dev_manage" on premium_invite_links for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);
create policy "premium_links_public_read" on premium_invite_links for select using (active = true);

-- Team-level invite link (one persistent link per property for admin sharing)
alter table properties add column if not exists team_invite_token text unique default gen_random_uuid()::text;
alter table properties add column if not exists team_invite_role text check (team_invite_role in ('admin', 'rep')) default 'rep';

-- Revenue tracking, multi-year deals, team hierarchy, sponsor logos

-- Multi-year deal revenue tracking
alter table deals add column if not exists is_multi_year boolean default false;
alter table deals add column if not exists deal_years integer default 1;
alter table deals add column if not exists annual_values jsonb; -- {"2025": 50000, "2026": 55000, "2027": 60000}
alter table deals add column if not exists renewal_date date;

-- Contract revenue per year
alter table contracts add column if not exists annual_revenue jsonb; -- {"2025": 50000, "2026": 55000}
alter table contracts add column if not exists contract_years integer default 1;
alter table contracts add column if not exists is_multi_year boolean default false;

-- Sponsor logos
alter table deals add column if not exists logo_url text;

-- Fulfillment media attachments
create table if not exists fulfillment_media (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid references fulfillment_records(id) on delete cascade,
  deal_id uuid references deals(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_type text, -- image, video, document
  mime_type text,
  notes text,
  uploaded_at timestamptz default now()
);

create index if not exists idx_fulfillment_media_deal on fulfillment_media(deal_id);
create index if not exists idx_fulfillment_media_fulfillment on fulfillment_media(fulfillment_id);

-- RLS for fulfillment_media
alter table fulfillment_media enable row level security;
create policy "media_property_access" on fulfillment_media for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- Team hierarchy and admin system
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  property_id uuid references properties(id) on delete cascade,
  type text check (type in ('property', 'agency', 'company')) default 'property',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text check (role in ('owner', 'admin', 'member')) default 'member',
  invited_by uuid references profiles(id),
  new_business_goal numeric default 0,
  renewal_goal numeric default 0,
  joined_at timestamptz default now(),
  unique(team_id, user_id)
);

create index if not exists idx_team_members_team on team_members(team_id);
create index if not exists idx_team_members_user on team_members(user_id);

-- RLS for teams
alter table teams enable row level security;
create policy "teams_access" on teams for all using (
  id in (select team_id from team_members where user_id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

alter table team_members enable row level security;
create policy "team_members_access" on team_members for all using (
  team_id in (select team_id from team_members where user_id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- Contract survey ratings
alter table contracts add column if not exists creation_rating integer; -- 1-5 stars
alter table contracts add column if not exists creation_feedback text;

-- E-signature tracking
alter table contracts add column if not exists signature_status text check (signature_status in ('not_started', 'pending', 'partially_signed', 'completed')) default 'not_started';
alter table contracts add column if not exists signers jsonb; -- [{name, email, role, order, signed_at, signature_data}]
alter table contracts add column if not exists signature_requested_at timestamptz;
alter table contracts add column if not exists fully_signed_at timestamptz;

-- User settings/preferences
alter table profiles add column if not exists dashboard_config jsonb; -- {cardOrder: [...], hiddenCards: [...]}
alter table profiles add column if not exists click_to_call_confirm boolean default true;
alter table profiles add column if not exists notification_preferences jsonb;

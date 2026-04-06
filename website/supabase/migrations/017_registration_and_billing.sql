-- Registration, billing, and enhanced admin

-- Subscription/billing on properties
alter table properties add column if not exists plan text check (plan in ('free', 'starter', 'pro', 'enterprise')) default 'free';
alter table properties add column if not exists stripe_customer_id text;
alter table properties add column if not exists stripe_subscription_id text;
alter table properties add column if not exists billing_email text;
alter table properties add column if not exists plan_started_at timestamptz;
alter table properties add column if not exists plan_expires_at timestamptz;
alter table properties add column if not exists max_users integer default 3;
alter table properties add column if not exists logo_url text;
alter table properties add column if not exists website text;
alter table properties add column if not exists phone text;
alter table properties add column if not exists address text;
alter table properties add column if not exists type text check (type in ('college', 'professional', 'minor_league', 'agency', 'other')) default 'college';

-- Profile enhancements
alter table profiles add column if not exists email text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists title text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists onboarding_completed boolean default false;
alter table profiles add column if not exists last_login timestamptz;
alter table profiles add column if not exists invited_by uuid references profiles(id);

-- Invitations table for team signup flow
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  email text not null,
  role text check (role in ('admin', 'rep')) default 'rep',
  invited_by uuid references profiles(id),
  token text unique default gen_random_uuid()::text,
  accepted boolean default false,
  accepted_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

create index if not exists idx_invitations_token on invitations(token);
create index if not exists idx_invitations_email on invitations(email);

alter table invitations enable row level security;
create policy "invitations_property_access" on invitations for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- Allow anyone to read invitations by token (for accepting)
create policy "invitations_read_by_token" on invitations for select using (true);

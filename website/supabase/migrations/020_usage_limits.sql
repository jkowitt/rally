-- Usage tracking for free tier limits
create table if not exists usage_tracker (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action_type text not null check (action_type in ('prospect_search', 'contact_research', 'contract_upload', 'ai_valuation', 'newsletter_generate')),
  created_at timestamptz default now()
);

create index if not exists idx_usage_tracker_property on usage_tracker(property_id, action_type, created_at desc);

alter table usage_tracker enable row level security;
create policy "usage_tracker_property" on usage_tracker for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- Trial tracking on properties
alter table properties add column if not exists trial_started_at timestamptz;
alter table properties add column if not exists trial_ends_at timestamptz;

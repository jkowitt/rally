-- Sportify: run of show + event enhancements
create table if not exists event_runofshow (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  start_time time,
  duration_minutes integer default 15,
  activity text not null,
  owner text,
  notes text,
  completed boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index if not exists idx_runofshow_event on event_runofshow(event_id, sort_order);

-- Event attendance tracking
alter table events add column if not exists expected_attendees integer;
alter table events add column if not exists actual_attendees integer;
alter table events add column if not exists capacity integer;
alter table events add column if not exists ticket_price numeric;
alter table events add column if not exists broadcast_url text;
alter table events add column if not exists broadcast_channel text;
alter table events add column if not exists expected_viewership integer;
alter table events add column if not exists actual_viewership integer;

-- Event vendor enhancements
alter table event_vendors add column if not exists contact_email text;
alter table event_vendors add column if not exists contact_phone text;
alter table event_vendors add column if not exists total_cost numeric;
alter table event_vendors add column if not exists payment_status text check (payment_status in ('Unpaid','Partial','Paid')) default 'Unpaid';

-- Event activations enhancements
alter table event_activations add column if not exists status text check (status in ('Scheduled','In Progress','Done','Issue')) default 'Scheduled';
alter table event_activations add column if not exists asset_delivered text;
alter table event_activations add column if not exists quantity_delivered integer;
alter table event_activations add column if not exists proof_photo_url text;

-- Valora: market position + deal linkage
alter table valuations add column if not exists deal_id uuid references deals(id) on delete set null;
alter table valuations add column if not exists event_id uuid references events(id) on delete set null;
alter table valuations add column if not exists market_position text check (market_position in ('below','fair','above'));
alter table valuations add column if not exists market_baseline numeric;

-- RLS for new table
alter table event_runofshow enable row level security;
create policy "runofshow_event_access" on event_runofshow for all using (
  exists (select 1 from events where events.id = event_runofshow.event_id and events.property_id in (select property_id from profiles where id = auth.uid()))
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- Newsletter: weekly digests + daily afternoon highlights

create table if not exists newsletters (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  type text not null check (type in ('weekly_digest', 'afternoon_update')),
  title text not null,
  content text not null,
  summary text,
  topics jsonb, -- array of topic objects {title, category, snippet}
  published_at timestamptz default now(),
  week_of date, -- for weekly digests, the Monday of that week
  archived boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_newsletters_property on newsletters(property_id);
create index if not exists idx_newsletters_type on newsletters(type);
create index if not exists idx_newsletters_published on newsletters(published_at desc);
create index if not exists idx_newsletters_week on newsletters(week_of);

-- RLS
alter table newsletters enable row level security;

create policy "newsletters_property_access" on newsletters
  for all using (
    property_id in (
      select property_id from profiles
      where id = auth.uid()
    )
  );

create policy "newsletters_developer_bypass" on newsletters
  for all using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'developer'
    )
  );

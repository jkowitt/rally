-- Newsletter: weekly digests + daily afternoon highlights
-- Newsletters are GLOBAL (shared across all users), not per-property

create table if not exists newsletters (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties on delete set null, -- nullable, newsletters are global
  type text not null check (type in ('weekly_digest', 'afternoon_update')),
  title text not null,
  content text not null,
  summary text,
  topics jsonb, -- array of topic objects {title, category, snippet, source}
  sources jsonb, -- array of source objects {name, url, description}
  published_at timestamptz default now(),
  week_of date, -- for weekly digests, the Monday of that week
  archived boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_newsletters_type on newsletters(type);
create index if not exists idx_newsletters_published on newsletters(published_at desc);
create index if not exists idx_newsletters_week on newsletters(week_of);

-- RLS: everyone can read newsletters (they are shared)
alter table newsletters enable row level security;

create policy "newsletters_read_all" on newsletters
  for select using (true);

create policy "newsletters_insert_authenticated" on newsletters
  for insert with check (auth.uid() is not null);

create policy "newsletters_developer_manage" on newsletters
  for all using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'developer'
    )
  );

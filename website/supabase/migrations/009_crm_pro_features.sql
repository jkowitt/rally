-- CRM Pro Features: Activities, Tasks, Deal Scoring, Tags

-- Activity log (calls, emails, meetings, notes tied to deals)
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  deal_id uuid references deals on delete cascade,
  contact_email text,
  activity_type text not null check (activity_type in ('Call','Email','Meeting','Note','Task Completed','Stage Change','Contract Sent','Follow Up')),
  subject text,
  description text,
  occurred_at timestamptz default now(),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Tasks / follow-ups
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  deal_id uuid references deals on delete cascade,
  title text not null,
  description text,
  due_date date,
  priority text check (priority in ('High','Medium','Low')) default 'Medium',
  status text check (status in ('Pending','In Progress','Done')) default 'Pending',
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Deal scoring and probability
alter table deals add column if not exists win_probability integer default 0;
alter table deals add column if not exists deal_score integer default 0;
alter table deals add column if not exists expected_close_date date;
alter table deals add column if not exists lost_reason text;
alter table deals add column if not exists tags text[] default '{}';
alter table deals add column if not exists stale_days integer default 0;

-- Contact tags
alter table deals add column if not exists contact_tags text[] default '{}';

-- RLS for activities
alter table activities enable row level security;
create policy "activities_property_access" on activities for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- RLS for tasks
alter table tasks enable row level security;
create policy "tasks_property_access" on tasks for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- Automated code analysis reports
create table if not exists code_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  run_time text check (run_time in ('morning', 'evening')),
  status text check (status in ('running', 'completed', 'failed')) default 'running',
  summary text,
  working jsonb, -- [{module, status, details}]
  issues jsonb, -- [{module, severity, description, fix_suggestion, can_auto_fix}]
  improvements jsonb, -- [{module, description, effort, impact}]
  build_status text, -- 'pass' or error message
  build_time_ms integer,
  total_files integer,
  total_lines integer,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_code_analysis_date on code_analysis_reports(run_date desc);

-- Fix requests from developer
create table if not exists code_fix_requests (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references code_analysis_reports(id) on delete cascade,
  issue_index integer, -- which issue from the report
  description text not null,
  status text check (status in ('pending', 'in_progress', 'completed', 'skipped')) default 'pending',
  fix_notes text,
  requested_by uuid references profiles(id),
  requested_at timestamptz default now(),
  completed_at timestamptz
);

-- User feature suggestions
create table if not exists feature_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  user_email text not null,
  contact_me boolean default false,
  property_id uuid references properties(id) on delete set null,
  category text check (category in (
    'Pipeline', 'Contracts', 'Assets', 'Fulfillment', 'Events', 'Valuations',
    'Newsletter', 'Contacts', 'Dashboard', 'Mobile', 'Integrations',
    'Reporting', 'Team', 'Billing', 'Other'
  )) default 'Other',
  title text not null,
  description text not null,
  priority text check (priority in ('nice_to_have', 'important', 'critical')) default 'nice_to_have',
  status text check (status in ('new', 'reviewed', 'planned', 'in_progress', 'completed', 'declined')) default 'new',
  developer_notes text,
  upvotes integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_suggestions_status on feature_suggestions(status);
create index if not exists idx_suggestions_category on feature_suggestions(category);
create index if not exists idx_suggestions_created on feature_suggestions(created_at desc);

-- RLS: anyone can submit suggestions, only developers can read all
alter table feature_suggestions enable row level security;
create policy "suggestions_insert_any" on feature_suggestions for insert with check (true);
create policy "suggestions_read_own" on feature_suggestions for select using (
  user_email = (select email from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "suggestions_update_dev" on feature_suggestions for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

alter table code_analysis_reports enable row level security;
create policy "analysis_dev_only" on code_analysis_reports for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

alter table code_fix_requests enable row level security;
create policy "fix_requests_dev_only" on code_fix_requests for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- Custom dashboard requests
create table if not exists custom_dashboard_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  requested_by uuid references profiles(id),
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  property_name text,
  -- What they want
  description text not null,
  desired_features jsonb, -- [{feature, priority, details}]
  branding jsonb, -- {logo_url, primary_color, accent_color, font}
  integrations_needed text, -- free text: "Salesforce, custom API, etc."
  timeline text, -- "ASAP", "Next quarter", etc.
  budget_range text, -- "$5K-$10K", "$10K-$25K", etc.
  -- Status tracking
  status text check (status in ('submitted', 'contacted', 'scoping', 'building', 'delivered', 'declined')) default 'submitted',
  developer_notes text,
  -- Delivery
  custom_dashboard_url text, -- /app/custom/:slug when built
  custom_config jsonb, -- the white-label config for this team
  created_at timestamptz default now(),
  updated_at timestamptz
);

create index if not exists idx_custom_dash_property on custom_dashboard_requests(property_id);
create index if not exists idx_custom_dash_status on custom_dashboard_requests(status);

alter table custom_dashboard_requests enable row level security;
create policy "custom_dash_insert_admin" on custom_dashboard_requests for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'developer'))
);
create policy "custom_dash_read" on custom_dashboard_requests for select using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);
create policy "custom_dash_update_dev" on custom_dashboard_requests for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- Custom dashboard configs (built by developer, served to specific properties)
create table if not exists custom_dashboards (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  slug text unique not null,
  name text not null,
  config jsonb not null, -- {logo, colors, widgets[], layout, data_sources[]}
  active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz
);

create index if not exists idx_custom_dashboards_property on custom_dashboards(property_id);
create index if not exists idx_custom_dashboards_slug on custom_dashboards(slug);

alter table custom_dashboards enable row level security;
create policy "custom_dashboards_read" on custom_dashboards for select using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);
create policy "custom_dashboards_manage_dev" on custom_dashboards for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

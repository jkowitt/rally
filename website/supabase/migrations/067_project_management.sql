-- ============================================================
-- MIGRATION 067 — PROJECT MANAGEMENT
-- ============================================================
-- Lightweight project management embedded into the CRM. A project
-- groups related tasks, links to deals/contracts/campaigns, has
-- milestones with target dates, and tracks progress as phases.
--
-- Tables:
--   project_templates      — reusable blueprints (phases + tasks)
--   projects               — active project instances
--   project_phases         — ordered phases within a project
--   project_tasks          — individual tasks within a phase
--   project_comments       — threaded comments on projects/tasks
--
-- Also installs a trigger that auto-creates a project from the
-- default template when a deal moves to 'closed-won' stage.
-- ============================================================

-- ========================
-- 1. PROJECT TEMPLATES
-- ========================
create table if not exists project_templates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  description text,
  template_data jsonb not null default '{}'::jsonb,
  is_default boolean default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table project_templates enable row level security;
create policy "project_templates_all" on project_templates
  for all using (
    property_id is null
    or property_id = get_user_property_id()
    or is_developer()
  ) with check (
    property_id is null
    or property_id = get_user_property_id()
    or is_developer()
  );

-- ========================
-- 2. PROJECTS
-- ========================
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
    -- 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority text not null default 'medium',
    -- 'low' | 'medium' | 'high' | 'urgent'
  current_phase text,

  -- Linked entities (all nullable — a project may link to none, one, or many)
  deal_id uuid references deals(id) on delete set null,
  contract_id uuid references contracts(id) on delete set null,
  campaign_id uuid,

  -- People
  owner_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  template_id uuid references project_templates(id) on delete set null,

  -- Dates
  start_date date,
  target_end_date date,
  actual_end_date date,

  -- Progress (denormalized — updated by trigger on task changes)
  total_tasks integer not null default 0,
  completed_tasks integer not null default 0,
  progress_percent integer not null default 0,

  -- Metadata
  tags text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_property on projects(property_id);
create index if not exists idx_projects_deal on projects(deal_id) where deal_id is not null;
create index if not exists idx_projects_status on projects(status);
create index if not exists idx_projects_owner on projects(owner_id);

alter table projects enable row level security;
create policy "projects_all" on projects
  for all using (
    property_id = get_user_property_id() or is_developer()
  ) with check (
    property_id = get_user_property_id() or is_developer()
  );

-- ========================
-- 3. PROJECT PHASES
-- ========================
create table if not exists project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  display_order integer not null default 0,
  status text not null default 'pending',
    -- 'pending' | 'active' | 'completed' | 'skipped'
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_phases_project on project_phases(project_id, display_order);

alter table project_phases enable row level security;
create policy "project_phases_all" on project_phases
  for all using (
    exists (select 1 from projects p where p.id = project_id and (p.property_id = get_user_property_id() or is_developer()))
  ) with check (
    exists (select 1 from projects p where p.id = project_id and (p.property_id = get_user_property_id() or is_developer()))
  );

-- ========================
-- 4. PROJECT TASKS
-- ========================
create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  phase_id uuid references project_phases(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo',
    -- 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority text not null default 'medium',
    -- 'low' | 'medium' | 'high' | 'urgent'
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  display_order integer not null default 0,

  -- Cross-links to other Rally entities
  linked_deal_id uuid references deals(id) on delete set null,
  linked_contract_id uuid references contracts(id) on delete set null,
  linked_campaign_id uuid,

  tags text[] default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_tasks_project on project_tasks(project_id);
create index if not exists idx_project_tasks_phase on project_tasks(phase_id);
create index if not exists idx_project_tasks_assignee on project_tasks(assignee_id);
create index if not exists idx_project_tasks_status on project_tasks(status);

alter table project_tasks enable row level security;
create policy "project_tasks_all" on project_tasks
  for all using (
    exists (select 1 from projects p where p.id = project_id and (p.property_id = get_user_property_id() or is_developer()))
  ) with check (
    exists (select 1 from projects p where p.id = project_id and (p.property_id = get_user_property_id() or is_developer()))
  );

-- ========================
-- 5. PROJECT COMMENTS
-- ========================
create table if not exists project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references project_tasks(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_comments_project on project_comments(project_id, created_at desc);
create index if not exists idx_project_comments_task on project_comments(task_id) where task_id is not null;

alter table project_comments enable row level security;
create policy "project_comments_all" on project_comments
  for all using (
    exists (select 1 from projects p where p.id = project_id and (p.property_id = get_user_property_id() or is_developer()))
  ) with check (
    exists (select 1 from projects p where p.id = project_id and (p.property_id = get_user_property_id() or is_developer()))
  );

-- ========================
-- 6. PROGRESS TRIGGER
-- ========================
-- Auto-recalculates project.progress_percent, total_tasks, and
-- completed_tasks whenever a project_tasks row is inserted, updated,
-- or deleted. This keeps the project list view fast (no subqueries).
create or replace function update_project_progress()
returns trigger
language plpgsql
security definer
as $$
declare
  v_project_id uuid;
  v_total integer;
  v_completed integer;
begin
  v_project_id := coalesce(new.project_id, old.project_id);

  select
    count(*),
    count(*) filter (where status = 'done')
  into v_total, v_completed
  from project_tasks
  where project_id = v_project_id;

  update projects set
    total_tasks = v_total,
    completed_tasks = v_completed,
    progress_percent = case when v_total > 0 then round((v_completed::numeric / v_total) * 100) else 0 end,
    updated_at = now()
  where id = v_project_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists project_tasks_progress_trigger on project_tasks;
create trigger project_tasks_progress_trigger
  after insert or update or delete on project_tasks
  for each row
  execute function update_project_progress();

-- ========================
-- 7. AUTO-CREATE ON DEAL CLOSE
-- ========================
-- When a deal moves to 'closed-won', auto-create a project using
-- the default template for that property. If no default template
-- exists, create a basic project with 4 standard phases.
create or replace function auto_create_project_on_deal_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template project_templates%rowtype;
  v_project_id uuid;
  v_phase_id uuid;
  v_phase jsonb;
  v_task jsonb;
  v_order integer;
begin
  -- Only fire when stage changes TO 'closed-won'
  if (tg_op != 'UPDATE') then return new; end if;
  if (old.stage = new.stage) then return new; end if;
  if (new.stage != 'closed-won') then return new; end if;

  -- Check if a project already exists for this deal
  if exists (select 1 from projects where deal_id = new.id) then
    return new;
  end if;

  -- Try to find the default template for this property
  select * into v_template
  from project_templates
  where (property_id = new.property_id or property_id is null)
    and is_default = true
  order by property_id nulls last
  limit 1;

  -- Create the project
  insert into projects (
    property_id, name, description, status, deal_id,
    owner_id, created_by, template_id, start_date
  ) values (
    new.property_id,
    coalesce(new.company_name, 'Deal') || ' — Fulfillment',
    'Auto-created from deal ' || coalesce(new.company_name, new.id::text) || ' closing.',
    'active',
    new.id,
    new.assigned_to,
    new.assigned_to,
    v_template.id,
    current_date
  ) returning id into v_project_id;

  if v_template.id is not null and v_template.template_data ? 'phases' then
    -- Instantiate from template
    v_order := 0;
    for v_phase in select * from jsonb_array_elements(v_template.template_data->'phases') loop
      v_order := v_order + 1;
      insert into project_phases (project_id, name, display_order, status)
      values (v_project_id, v_phase->>'name', v_order, case when v_order = 1 then 'active' else 'pending' end)
      returning id into v_phase_id;

      if v_phase ? 'tasks' then
        for v_task in select * from jsonb_array_elements(v_phase->'tasks') loop
          insert into project_tasks (project_id, phase_id, title, priority, display_order, created_by)
          values (
            v_project_id, v_phase_id,
            v_task->>'title',
            coalesce(v_task->>'priority', 'medium'),
            coalesce((v_task->>'order')::integer, 0),
            new.assigned_to
          );
        end loop;
      end if;
    end loop;
  else
    -- No template — create 4 default phases
    insert into project_phases (project_id, name, display_order, status) values
      (v_project_id, 'Onboarding', 1, 'active'),
      (v_project_id, 'Setup & Planning', 2, 'pending'),
      (v_project_id, 'Fulfillment', 3, 'pending'),
      (v_project_id, 'Renewal', 4, 'pending');
  end if;

  -- Update project.current_phase
  update projects set current_phase = 'Onboarding' where id = v_project_id;

  return new;
exception
  when others then
    raise notice 'auto_create_project_on_deal_close failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists deals_auto_project on deals;
create trigger deals_auto_project
  after update on deals
  for each row
  execute function auto_create_project_on_deal_close();

-- ========================
-- 8. SEED DEFAULT TEMPLATES
-- ========================
insert into project_templates (name, description, is_default, template_data) values
(
  'Sponsor Onboarding',
  'Default template for new sponsor deals. 4 phases from onboarding through renewal.',
  true,
  '{
    "phases": [
      {
        "name": "Onboarding",
        "tasks": [
          {"title": "Schedule kickoff meeting", "priority": "high", "order": 1},
          {"title": "Collect brand assets (logos, guidelines)", "priority": "medium", "order": 2},
          {"title": "Send welcome packet", "priority": "medium", "order": 3},
          {"title": "Set up in fulfillment tracker", "priority": "high", "order": 4}
        ]
      },
      {
        "name": "Setup & Planning",
        "tasks": [
          {"title": "Map deliverables from contract", "priority": "high", "order": 1},
          {"title": "Create asset inventory entries", "priority": "medium", "order": 2},
          {"title": "Assign team member responsibilities", "priority": "medium", "order": 3},
          {"title": "Set milestone deadlines", "priority": "high", "order": 4}
        ]
      },
      {
        "name": "Fulfillment",
        "tasks": [
          {"title": "Execute first deliverable", "priority": "high", "order": 1},
          {"title": "Send mid-season proof of performance", "priority": "medium", "order": 2},
          {"title": "Compile photo/video documentation", "priority": "low", "order": 3},
          {"title": "Generate fulfillment report", "priority": "high", "order": 4}
        ]
      },
      {
        "name": "Renewal",
        "tasks": [
          {"title": "Send end-of-term report to sponsor", "priority": "high", "order": 1},
          {"title": "Schedule renewal conversation", "priority": "high", "order": 2},
          {"title": "Prepare renewal proposal with upsell options", "priority": "medium", "order": 3},
          {"title": "Close renewal or archive deal", "priority": "high", "order": 4}
        ]
      }
    ]
  }'::jsonb
),
(
  'Marketing Campaign',
  'Template for marketing initiatives — content creation through analysis.',
  false,
  '{
    "phases": [
      {
        "name": "Planning",
        "tasks": [
          {"title": "Define campaign goals and KPIs", "priority": "high", "order": 1},
          {"title": "Identify target audience segments", "priority": "medium", "order": 2},
          {"title": "Set budget and timeline", "priority": "high", "order": 3}
        ]
      },
      {
        "name": "Content Creation",
        "tasks": [
          {"title": "Draft copy and messaging", "priority": "high", "order": 1},
          {"title": "Design creative assets", "priority": "medium", "order": 2},
          {"title": "Build email template", "priority": "medium", "order": 3},
          {"title": "Internal review and approval", "priority": "high", "order": 4}
        ]
      },
      {
        "name": "Launch",
        "tasks": [
          {"title": "Schedule and send campaign", "priority": "high", "order": 1},
          {"title": "Post social media content", "priority": "medium", "order": 2},
          {"title": "Monitor initial delivery and engagement", "priority": "high", "order": 3}
        ]
      },
      {
        "name": "Analysis",
        "tasks": [
          {"title": "Pull campaign analytics", "priority": "medium", "order": 1},
          {"title": "Compare against KPIs", "priority": "high", "order": 2},
          {"title": "Document learnings for next campaign", "priority": "low", "order": 3}
        ]
      }
    ]
  }'::jsonb
)
on conflict do nothing;

-- ============================================================
-- MIGRATION 059 — QA WALKTHROUGH COMMENTS
-- ============================================================
-- A lightweight ad-hoc comment capture system for walking
-- through the site during QA. Separate from the structured
-- qa_test_cases workflow — this is for "leave me a note about
-- this page" style feedback.
--
-- Usage:
--   Developer clicks the floating QA button on any page, types
--   a comment, picks a category, submits. Row is inserted with
--   the current URL and page context pre-filled. All comments
--   are visible in a single report at /app/developer → QA
--   Comments tab.
-- ============================================================

create table if not exists qa_comments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  property_id uuid references properties(id) on delete set null,

  -- Content
  comment text not null,
  category text not null default 'note',
    -- 'bug' | 'suggestion' | 'polish' | 'question' | 'note'
  priority text not null default 'normal',
    -- 'low' | 'normal' | 'high' | 'blocker'

  -- Page context — auto-captured on submit
  page_url text,                   -- full URL at time of comment
  page_title text,                 -- document.title
  module text,                     -- inferred module (crm, sportify, etc.)
  viewport_width integer,
  viewport_height integer,
  user_agent text,

  -- Lifecycle
  status text not null default 'open',
    -- 'open' | 'resolved' | 'wontfix' | 'dismissed'
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,

  -- Optional screenshot (base64 or storage URL — we keep it simple)
  screenshot_url text,

  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_qa_comments_created on qa_comments(created_at desc);
create index if not exists idx_qa_comments_status on qa_comments(status);
create index if not exists idx_qa_comments_category on qa_comments(category);
create index if not exists idx_qa_comments_module on qa_comments(module);

-- ─── RLS ─────────────────────────────────────────────────────
alter table qa_comments enable row level security;

-- Any authenticated user can INSERT a comment (capture during QA).
-- Viewing the consolidated report is developer-only below.
create policy "qa_comments_insert" on qa_comments
  for insert with check (auth.uid() is not null);

-- Developer reads everything. Non-developers can read their own
-- comments (so a user walking the site can see what they've
-- submitted during the session).
create policy "qa_comments_select" on qa_comments
  for select using (
    is_developer() or created_by = auth.uid()
  );

-- Only developer can update / delete (resolve, dismiss, etc.)
create policy "qa_comments_update" on qa_comments
  for update using (is_developer());

create policy "qa_comments_delete" on qa_comments
  for delete using (is_developer());

-- ============================================================
-- DONE
-- ============================================================

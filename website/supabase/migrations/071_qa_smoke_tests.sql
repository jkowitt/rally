-- ============================================================
-- MIGRATION 071 — QA SMOKE TEST RESULTS + REGISTRY SOURCE
-- ============================================================
-- Adds:
-- 1. `source` column on qa_test_cases so registry-managed cases
--    can be distinguished from manually-authored ones.
-- 2. qa_smoke_results table — captures the output of each smoke
--    test phase per Auto QA run (latency, status, error msg).
-- ============================================================

alter table qa_test_cases add column if not exists source text default 'manual';
  -- 'manual' (entered in QA UI) | 'registry' (synced from src/lib/qaTestRegistry.js)

create index if not exists idx_qa_test_cases_source on qa_test_cases(source);

-- Smoke test results — one row per (auto_qa_run, smoke_test_name)
create table if not exists qa_smoke_results (
  id uuid primary key default gen_random_uuid(),
  qa_report_id uuid references qa_auto_reports(id) on delete cascade,
  test_name text not null,
  category text,
    -- 'edge_function' | 'auth' | 'crud' | 'rls' | 'rpc'
  passed boolean not null,
  latency_ms integer,
  error_message text,
  ran_at timestamptz not null default now()
);

create index if not exists idx_qa_smoke_results_report
  on qa_smoke_results(qa_report_id, ran_at desc);
create index if not exists idx_qa_smoke_results_failed
  on qa_smoke_results(passed, ran_at desc) where not passed;

alter table qa_smoke_results enable row level security;

create policy "qa_smoke_results_dev_read" on qa_smoke_results for select using (
  is_developer()
);
create policy "qa_smoke_results_dev_insert" on qa_smoke_results for insert with check (
  is_developer()
);

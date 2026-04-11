-- QA Test Task Manager: attempts tracking, notes, and industry-standard testing

-- Add completion tracking columns to qa_test_cases
ALTER TABLE qa_test_cases ADD COLUMN IF NOT EXISTS target_pass_count integer DEFAULT 5;
ALTER TABLE qa_test_cases ADD COLUMN IF NOT EXISTS retest_interval_days integer DEFAULT 14;
ALTER TABLE qa_test_cases ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE qa_test_cases ADD COLUMN IF NOT EXISTS page_url text;
ALTER TABLE qa_test_cases ADD COLUMN IF NOT EXISTS action text;

-- Track every single test attempt (auto or manual)
CREATE TABLE IF NOT EXISTS qa_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id uuid REFERENCES qa_test_cases(id) ON DELETE CASCADE,
  attempt_type text CHECK (attempt_type IN ('auto_claude', 'manual_dev', 'auto_platform')) DEFAULT 'manual_dev',
  result text CHECK (result IN ('passed', 'failed', 'blocked', 'skipped')) NOT NULL,
  tested_by uuid REFERENCES profiles(id),
  notes text,
  confidence numeric, -- for Claude attempts
  duration_ms integer, -- how long the test took
  attempted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_attempts_case ON qa_test_attempts(test_case_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_attempts_result ON qa_test_attempts(result);

-- Dev manual completion tracking per test (separate from automated runs)
CREATE TABLE IF NOT EXISTS qa_test_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id uuid REFERENCES qa_test_cases(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(test_case_id)
);

-- Improvement notes for export
CREATE TABLE IF NOT EXISTS qa_improvement_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id uuid REFERENCES qa_test_cases(id) ON DELETE SET NULL,
  module text,
  industry text,
  page_url text,
  page_view text,
  action text,
  task text,
  notes text NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  category text CHECK (category IN ('bug', 'improvement', 'feature_request', 'ui', 'performance', 'security')) DEFAULT 'improvement',
  date_tested timestamptz,
  date_logged timestamptz DEFAULT now(),
  logged_by uuid REFERENCES profiles(id),
  resolved boolean DEFAULT false,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_improvement_notes_date ON qa_improvement_notes(date_logged DESC);
CREATE INDEX IF NOT EXISTS idx_improvement_notes_module ON qa_improvement_notes(module);
CREATE INDEX IF NOT EXISTS idx_improvement_notes_resolved ON qa_improvement_notes(resolved);

ALTER TABLE qa_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_improvement_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_attempts_access" ON qa_test_attempts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));
CREATE POLICY "qa_completions_access" ON qa_test_completions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));
CREATE POLICY "qa_notes_access" ON qa_improvement_notes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

-- Aggregated view for the task manager UI
CREATE OR REPLACE VIEW qa_task_summary AS
SELECT
  tc.id,
  tc.module,
  tc.title,
  tc.steps,
  tc.expected_result,
  tc.priority,
  tc.category,
  tc.target_pass_count,
  tc.retest_interval_days,
  tc.page_url,
  tc.action,
  COALESCE(attempts.total, 0) AS total_attempts,
  COALESCE(attempts.passed, 0) AS passed_attempts,
  COALESCE(attempts.failed, 0) AS failed_attempts,
  CASE WHEN COALESCE(attempts.total, 0) > 0
    THEN ROUND((attempts.passed::numeric / attempts.total::numeric) * 100)
    ELSE 0
  END AS performance_score,
  attempts.last_attempted,
  attempts.last_auto_checked,
  COALESCE(comp.completed, false) AS dev_completed,
  comp.completed_at AS dev_completed_at,
  comp.notes AS dev_notes,
  CASE WHEN COALESCE(attempts.passed, 0) >= tc.target_pass_count THEN true ELSE false END AS target_met
FROM qa_test_cases tc
LEFT JOIN (
  SELECT
    test_case_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE result = 'passed') AS passed,
    COUNT(*) FILTER (WHERE result = 'failed') AS failed,
    MAX(attempted_at) AS last_attempted,
    MAX(attempted_at) FILTER (WHERE attempt_type = 'auto_claude') AS last_auto_checked
  FROM qa_test_attempts
  GROUP BY test_case_id
) attempts ON attempts.test_case_id = tc.id
LEFT JOIN qa_test_completions comp ON comp.test_case_id = tc.id;

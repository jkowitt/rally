-- Automated QA reports with auto-fix tracking
CREATE TABLE IF NOT EXISTS qa_auto_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date timestamptz DEFAULT now(),
  schedule text, -- 'monday', 'wednesday', 'friday', 'manual'
  status text CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  health_score integer, -- 0-100

  -- Counts
  total_checks integer DEFAULT 0,
  passed_checks integer DEFAULT 0,
  failed_checks integer DEFAULT 0,

  -- Auto-fix results
  auto_fixes_applied integer DEFAULT 0,
  auto_fixes jsonb DEFAULT '[]', -- [{table, action, count, detail}]

  -- Platform stats snapshot
  platform_stats jsonb DEFAULT '{}',

  -- Claude analysis
  claude_analysis jsonb DEFAULT '{}', -- {summary, issues[], improvements[], working[]}

  -- Copy-paste instructions for Claude Code
  claude_code_instructions text,

  -- Module breakdown
  module_scores jsonb DEFAULT '{}', -- {pipeline: 95, contracts: 80, ...}

  completed_at timestamptz,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE qa_auto_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_bizops_qa_reports" ON qa_auto_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

CREATE INDEX IF NOT EXISTS idx_qa_auto_reports_date ON qa_auto_reports(run_date DESC);

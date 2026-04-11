-- Change log: tracks all code changes and improvements
CREATE TABLE IF NOT EXISTS change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text CHECK (category IN ('feature', 'bugfix', 'improvement', 'refactor', 'security', 'performance', 'mobile', 'qa', 'infrastructure')) DEFAULT 'improvement',
  module text, -- which module was changed
  files_changed text, -- comma-separated file paths
  source text CHECK (source IN ('claude_code', 'manual', 'auto_qa', 'auto_fix')) DEFAULT 'claude_code',
  commit_sha text,
  qa_report_id uuid REFERENCES qa_auto_reports(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_bizops_changelog" ON change_log FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

CREATE INDEX IF NOT EXISTS idx_change_log_date ON change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_category ON change_log(category);

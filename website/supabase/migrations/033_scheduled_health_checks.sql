-- Scheduled health check reports
CREATE TABLE IF NOT EXISTS health_check_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date timestamptz DEFAULT now(),
  schedule text, -- 'monday', 'thursday', 'sunday'
  status text CHECK (status IN ('passed', 'warnings', 'failed')) DEFAULT 'passed',
  total_checks integer DEFAULT 0,
  passed_checks integer DEFAULT 0,
  failed_checks integer DEFAULT 0,
  results jsonb, -- array of { name, ok, detail }
  platform_stats jsonb, -- { users, properties, deals, contracts, assets, ... }
  error_count_24h integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE health_check_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_read_dev" ON health_check_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);
CREATE POLICY "health_insert_any" ON health_check_reports FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_health_reports_date ON health_check_reports(run_date DESC);

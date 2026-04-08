-- ============================================================
-- BUSINESS OPS — Internal operating system for running Loud Legacy
-- Only accessible to businessops permission
-- ============================================================

-- Add businessops role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Revenue pipeline (companies being pitched ON the platform)
CREATE TABLE IF NOT EXISTS biz_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  contact_title text,
  industry text,
  property_type text,
  status text CHECK (status IN ('lead','contacted','demo_scheduled','demo_completed','trial','negotiation','closed_won','closed_lost')) DEFAULT 'lead',
  deal_value numeric,
  monthly_value numeric,
  plan_tier text,
  notes text,
  next_follow_up date,
  source text,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE biz_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biz_pipeline_ops" ON biz_pipeline FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- Business goals
CREATE TABLE IF NOT EXISTS biz_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL, -- '2025-04', '2025-Q2', '2025'
  metric text NOT NULL, -- 'signups', 'mrr', 'conversions', 'churn_rate', 'deals_closed', 'arr'
  target_value numeric NOT NULL,
  actual_value numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE biz_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biz_goals_ops" ON biz_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- Connections (personal CRM for industry contacts, investors, advisors)
CREATE TABLE IF NOT EXISTS biz_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  title text,
  email text,
  phone text,
  linkedin text,
  category text CHECK (category IN ('prospect','investor','advisor','partner','media','industry','other')) DEFAULT 'prospect',
  relationship_strength text CHECK (relationship_strength IN ('cold','warm','hot','champion')) DEFAULT 'cold',
  last_contacted date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE biz_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biz_connections_ops" ON biz_connections FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- Financial tracking
CREATE TABLE IF NOT EXISTS biz_finances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL, -- '2025-04'
  category text NOT NULL, -- 'revenue', 'expense', 'investment'
  subcategory text, -- 'starter_plans', 'pro_plans', 'hosting', 'api_costs', etc
  amount numeric NOT NULL,
  description text,
  recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE biz_finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biz_finances_ops" ON biz_finances FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- Roadmap items
CREATE TABLE IF NOT EXISTS biz_roadmap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text, -- 'feature', 'bug', 'integration', 'infrastructure', 'design'
  priority text CHECK (priority IN ('critical','high','medium','low')) DEFAULT 'medium',
  effort text CHECK (effort IN ('xs','s','m','l','xl')) DEFAULT 'm',
  impact text CHECK (impact IN ('low','medium','high','critical')) DEFAULT 'medium',
  status text CHECK (status IN ('backlog','planned','in_progress','review','shipped','cancelled')) DEFAULT 'backlog',
  target_date date,
  shipped_date date,
  requested_by text,
  votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE biz_roadmap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biz_roadmap_ops" ON biz_roadmap FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- Claude Code sessions (code changes made through Business Ops)
CREATE TABLE IF NOT EXISTS biz_code_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  response text,
  files_changed jsonb,
  status text CHECK (status IN ('pending','generating','review','approved','deployed','rejected')) DEFAULT 'pending',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE biz_code_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biz_code_sessions_ops" ON biz_code_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- Phase 1: Fix broken RLS on biz_* tables (data leakage blocker)
-- Phase 2: Add property_id to enable multi-tenant client-facing features
-- Phase 3: Add growth workbook and strategic workbook tables

-- ─── Fix broken RLS on financial projections tables ───
-- Originally these had USING (true) which means any authenticated user could read all rows
ALTER TABLE biz_projections ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE biz_ad_campaigns ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE biz_reports ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS biz_projections_ops ON biz_projections;
DROP POLICY IF EXISTS biz_ad_campaigns_ops ON biz_ad_campaigns;
DROP POLICY IF EXISTS biz_reports_ops ON biz_reports;

CREATE POLICY biz_projections_access ON biz_projections FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);
CREATE POLICY biz_ad_campaigns_access ON biz_ad_campaigns FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);
CREATE POLICY biz_reports_access ON biz_reports FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- ─── Add property_id to other biz_* tables for multi-tenancy ───
ALTER TABLE biz_goals ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE biz_connections ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE biz_finances ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;

-- Update policies to scope by property_id
DROP POLICY IF EXISTS biz_goals_ops ON biz_goals;
DROP POLICY IF EXISTS biz_connections_ops ON biz_connections;
DROP POLICY IF EXISTS biz_finances_ops ON biz_finances;

CREATE POLICY biz_goals_access ON biz_goals FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR property_id IS NULL
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);
CREATE POLICY biz_connections_access ON biz_connections FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR property_id IS NULL
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);
CREATE POLICY biz_finances_access ON biz_finances FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR property_id IS NULL
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- ─── Growth Workbook — self-assessment / "where you are" ───
CREATE TABLE IF NOT EXISTS growth_workbook_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  workbook_type text DEFAULT 'growth_assessment',
  business_model text, -- saas, services, agency, ecommerce, events, nonprofit
  current_stage text, -- idea, launch, growth, scale, mature
  responses jsonb DEFAULT '{}',
  health_score integer,
  strengths text[],
  gaps text[],
  recommendations jsonb DEFAULT '[]',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_workbook_property ON growth_workbook_responses(property_id);

ALTER TABLE growth_workbook_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY growth_workbook_access ON growth_workbook_responses FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- ─── Strategic Workbooks Library ───
CREATE TABLE IF NOT EXISTS strategic_workbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category text, -- marketing, finance, sales, operations, strategy
  industry text, -- nullable = applies to all
  business_model text, -- nullable = applies to all
  icon text,
  sections jsonb DEFAULT '[]', -- [{title, description, questions: []}]
  estimated_time_min integer DEFAULT 15,
  difficulty text DEFAULT 'beginner',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workbook_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id uuid REFERENCES strategic_workbooks(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  responses jsonb DEFAULT '{}',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workbook_completions_property ON workbook_completions(property_id);

ALTER TABLE strategic_workbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workbook_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY strategic_workbooks_read ON strategic_workbooks FOR SELECT USING (true);
CREATE POLICY strategic_workbooks_manage ON strategic_workbooks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);
CREATE POLICY workbook_completions_access ON workbook_completions FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

-- ─── Seed 6 starter workbooks ───
INSERT INTO strategic_workbooks (name, slug, description, category, icon, estimated_time_min, difficulty, sections) VALUES
('Ideal Customer Profile Deep Dive', 'icp-deep-dive', 'Define exactly who you sell to and why they buy. Outputs a usable ICP document.', 'strategy', '🎯', 25, 'beginner',
  '[{"title":"Demographics","questions":["What is the typical size of your target customer (employees, revenue)?","Which industries do they operate in?","Where are they located?"]},{"title":"Psychographics","questions":["What pain are they trying to solve?","What have they tried before that did not work?","What triggers them to look for a solution?"]},{"title":"Decision-Making","questions":["Who is the primary buyer?","Who else influences the decision?","What is their typical budget approval process?"]}]'::jsonb),

('90-Day Marketing Sprint', '90-day-marketing-sprint', 'Build a focused marketing plan you can execute in the next 90 days.', 'marketing', '🚀', 30, 'intermediate',
  '[{"title":"Goal","questions":["What one metric will define success in 90 days?","What is the baseline today?","What is the target?"]},{"title":"Channels","questions":["Which 2-3 channels will you prioritize?","What content will you create for each?","What is your weekly posting cadence?"]},{"title":"Budget","questions":["What is your total 90-day marketing budget?","How much goes to paid ads?","How much goes to content creation?"]}]'::jsonb),

('Sponsorship Sales Playbook', 'sponsorship-playbook', 'Document your repeatable sponsorship sales process from prospect to close.', 'sales', '📊', 35, 'intermediate',
  '[{"title":"Prospecting","questions":["How do you source new prospects?","What qualifies someone as a good fit?","How long is your typical sales cycle?"]},{"title":"Pitch","questions":["What is your primary value proposition?","What are your 3 most asked questions from prospects?","What is your typical deal structure?"]},{"title":"Objections","questions":["What are the top 3 objections you hear?","How do you address each?","When do you walk away from a deal?"]}]'::jsonb),

('Pricing Strategy Reset', 'pricing-reset', 'Re-evaluate your pricing to capture more value. Works for any business model.', 'finance', '💰', 20, 'intermediate',
  '[{"title":"Current State","questions":["What do you charge today?","How did you arrive at that price?","When did you last raise prices?"]},{"title":"Value","questions":["What ROI do customers get from your product?","What do comparable offerings cost?","Are you priced based on cost, competition, or value?"]},{"title":"Strategy","questions":["What would a 20% price increase do to conversion?","Should you add tiers?","Should you offer annual discounts?"]}]'::jsonb),

('Competitive Positioning Canvas', 'positioning-canvas', 'Define how you win vs your top 3 competitors.', 'strategy', '⚔️', 25, 'beginner',
  '[{"title":"Competitors","questions":["Who are your top 3 competitors?","What do they do well?","Where do they struggle?"]},{"title":"Your Edge","questions":["What do you do better than anyone?","What customer problem do you solve uniquely?","What would customers say when recommending you?"]},{"title":"Message","questions":["In one sentence, how are you different?","What would you tell a prospect deciding between you and a competitor?","What evidence backs up your claim?"]}]'::jsonb),

('Quarterly Business Review', 'quarterly-review', 'A structured template for reviewing the last 90 days and planning the next.', 'strategy', '📋', 30, 'beginner',
  '[{"title":"Last Quarter","questions":["What were your top 3 wins?","What were your top 3 misses?","What did you learn?"]},{"title":"Metrics","questions":["Revenue this quarter vs last?","New customers acquired?","Churn rate?"]},{"title":"Next Quarter","questions":["What are your top 3 priorities?","What metric will you focus on?","What is the biggest risk?"]}]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

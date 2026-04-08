-- Financial projections and scenario modeling
CREATE TABLE IF NOT EXISTS biz_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  assumptions jsonb NOT NULL, -- all input variables
  results jsonb, -- calculated 5-year projections
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE biz_projections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biz_projections_ops" ON biz_projections FOR ALL USING (true);

-- Ad spend / marketing campaigns
CREATE TABLE IF NOT EXISTS biz_ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL, -- 'linkedin', 'google', 'facebook', 'instagram', 'twitter', 'content', 'events', 'referral', 'other'
  status text DEFAULT 'planned', -- 'planned', 'active', 'paused', 'completed'
  monthly_budget numeric DEFAULT 0,
  cpm numeric, -- cost per 1000 impressions
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  signups integer DEFAULT 0,
  conversions integer DEFAULT 0,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE biz_ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biz_ad_campaigns_ops" ON biz_ad_campaigns FOR ALL USING (true);

-- Custom reports
CREATE TABLE IF NOT EXISTS biz_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  report_type text DEFAULT 'custom', -- 'financial', 'growth', 'marketing', 'custom', 'ai_generated'
  content text, -- markdown or HTML
  data jsonb, -- structured data for charts
  created_by uuid REFERENCES profiles(id),
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE biz_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biz_reports_ops" ON biz_reports FOR ALL USING (true);

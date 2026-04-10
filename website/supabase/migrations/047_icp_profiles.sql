-- ICP (Ideal Customer Profile) storage
CREATE TABLE IF NOT EXISTS icp_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,

  -- Firmographic filters
  company_size text, -- 'startup' | 'small' | 'mid' | 'large' | 'enterprise' | 'any'
  employee_min integer,
  employee_max integer,
  revenue_min numeric,
  revenue_max numeric,

  -- Geographic filters
  location_scope text, -- 'local' | 'regional' | 'national' | 'international' | 'any'
  cities text[],
  states text[],
  countries text[],

  -- Industry/Vertical
  industries text[], -- ['technology', 'finance', 'retail', etc]
  sub_industries text[],
  exclude_industries text[],

  -- Business characteristics
  business_type text, -- 'b2b' | 'b2c' | 'dtc' | 'b2b2c' | 'any'
  funding_stage text, -- 'bootstrapped' | 'seed' | 'series_a' | 'series_b_plus' | 'public' | 'any'
  growth_stage text, -- 'early' | 'growth' | 'mature' | 'any'

  -- Budget/Investment characteristics
  budget_min numeric, -- minimum sponsorship/partnership budget
  budget_max numeric,

  -- Special attributes
  attributes text[], -- ['woman_owned', 'minority_owned', 'local', 'nonprofit_partner', 'ceo_led', etc]

  -- Free-form notes for Claude
  ideal_description text, -- "We want to target mid-size fintech companies led by founders under 40..."

  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE icp_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "icp_property_access" ON icp_profiles FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

CREATE INDEX IF NOT EXISTS idx_icp_profiles_property ON icp_profiles(property_id);
CREATE INDEX IF NOT EXISTS idx_icp_profiles_default ON icp_profiles(property_id, is_default) WHERE is_default = true;

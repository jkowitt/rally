-- Service integrations: store API keys/tokens for external platforms
CREATE TABLE IF NOT EXISTS service_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL, -- 'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'google_ads', 'meta_ads', 'mailchimp', 'apollo', 'hunter'
  display_name text,
  api_key text, -- encrypted in practice
  api_secret text,
  access_token text,
  refresh_token text,
  account_id text, -- platform-specific account/page ID
  account_name text, -- display name for the connected account
  config jsonb DEFAULT '{}', -- extra config (page_id, ad_account_id, etc.)
  connected boolean DEFAULT false,
  auto_post boolean DEFAULT false, -- whether to auto-post or queue for manual approval
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_bizops_integrations" ON service_integrations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

-- Marketing posts: scheduled/published content across platforms
CREATE TABLE IF NOT EXISTS marketing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  caption text,
  media_urls text[], -- array of image/video URLs
  platforms text[] DEFAULT '{}', -- ['instagram', 'facebook', 'twitter', 'linkedin']
  post_type text CHECK (post_type IN ('organic', 'ad', 'story', 'reel', 'carousel')) DEFAULT 'organic',
  status text CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'paused')) DEFAULT 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  -- Ad-specific fields
  is_ad boolean DEFAULT false,
  ad_budget numeric,
  ad_duration_days integer,
  ad_target_audience jsonb, -- {age_range, interests, locations, etc.}
  ad_objective text, -- 'awareness', 'traffic', 'engagement', 'conversions', 'leads'
  -- Results tracking
  results jsonb DEFAULT '{}', -- {impressions, clicks, reach, engagement, spend}
  platform_post_ids jsonb DEFAULT '{}', -- {instagram: "post_123", facebook: "post_456"}
  -- Metadata
  tags text[],
  campaign_name text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE marketing_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_bizops_posts" ON marketing_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

CREATE INDEX IF NOT EXISTS idx_marketing_posts_status ON marketing_posts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_date ON marketing_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_integrations_service ON service_integrations(service);

-- Marketing templates: reusable post templates
CREATE TABLE IF NOT EXISTS marketing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  caption_template text,
  platforms text[] DEFAULT '{}',
  post_type text DEFAULT 'organic',
  tags text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE marketing_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_bizops_templates" ON marketing_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

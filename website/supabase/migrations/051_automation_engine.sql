-- Master automation settings
CREATE TABLE IF NOT EXISTS automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  master_automation_enabled boolean DEFAULT false,
  automation_enabled_at timestamptz,
  automation_disabled_at timestamptz,
  email_sequences_enabled boolean DEFAULT true,
  ad_campaigns_enabled boolean DEFAULT true,
  trial_nurture_enabled boolean DEFAULT true,
  upgrade_prompts_enabled boolean DEFAULT true,
  operational_tasks_enabled boolean DEFAULT true,
  social_scheduling_enabled boolean DEFAULT true,
  social_auto_publish boolean DEFAULT false,
  last_updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id)
);

CREATE TABLE IF NOT EXISTS automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_category text,
  triggered_by text DEFAULT 'automation',
  target_user_id uuid,
  target_email text,
  payload jsonb DEFAULT '{}',
  status text DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now(),
  executed_at timestamptz
);

-- Tolerate the old schema from migration 032 (same table name,
-- different columns). If automation_log already exists with the
-- old shape (automation_id/trigger_data/action_result/success/
-- executed_at), these ALTERs add the new columns so the index
-- below works and the app code in automationGate.js can read/write.
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS event_category text;
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS triggered_by text DEFAULT 'automation';
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS target_user_id uuid;
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS target_email text;
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS executed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_automation_log_category ON automation_log(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_log_status ON automation_log(status, created_at DESC);

-- Email sequence infrastructure
CREATE TABLE IF NOT EXISTS email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text NOT NULL,
  total_emails integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_sequence_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid REFERENCES email_sequences(id) ON DELETE CASCADE,
  day_offset integer NOT NULL,
  subject text NOT NULL,
  body_html text,
  body_text text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_id uuid REFERENCES email_sequences(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  current_email_index integer DEFAULT 0,
  completed boolean DEFAULT false,
  unsubscribed boolean DEFAULT false,
  paused boolean DEFAULT false,
  UNIQUE(user_id, sequence_id)
);

CREATE TABLE IF NOT EXISTS email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES email_sequence_enrollments(id) ON DELETE CASCADE,
  user_id uuid,
  email_index integer,
  subject text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced boolean DEFAULT false,
  unsubscribed boolean DEFAULT false,
  status text DEFAULT 'queued',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_sends_user ON email_sends(user_id, sent_at DESC);

-- Social posts
CREATE TABLE IF NOT EXISTS automation_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text,
  post_type text DEFAULT 'text',
  platform text DEFAULT 'linkedin',
  topic text,
  week_number integer,
  status text DEFAULT 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  generated_by text DEFAULT 'automation',
  approved_by_founder boolean DEFAULT false,
  founder_edited boolean DEFAULT false,
  engagement_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON automation_social_posts(status, scheduled_for);

-- User engagement scoring
CREATE TABLE IF NOT EXISTS user_engagement_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  tag text DEFAULT 'cold',
  login_count_7d integer DEFAULT 0,
  features_used text[],
  contracts_uploaded integer DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_tag ON user_engagement_scores(tag, calculated_at DESC);

-- Upgrade opportunities
CREATE TABLE IF NOT EXISTS upgrade_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  flagged_at timestamptz DEFAULT now(),
  actioned_at timestamptz,
  converted boolean DEFAULT false,
  dismissed boolean DEFAULT false
);

-- Churn risks
CREATE TABLE IF NOT EXISTS churn_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_level text,
  reason text,
  flagged_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id)
);

-- Ad campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  campaign_name text,
  campaign_id text,
  status text DEFAULT 'active',
  daily_budget numeric,
  spend_to_date numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  signups_attributed integer DEFAULT 0,
  ctr numeric,
  cost_per_signup numeric,
  start_date date,
  end_date date,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb,
  read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON admin_notifications(recipient_id, read, created_at DESC);

-- UTM attribution
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unsubscribed_marketing boolean DEFAULT false;

-- RLS
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admin-only access to automation tables
CREATE POLICY automation_settings_admin ON automation_settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY automation_log_admin ON automation_log FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY email_sequences_admin ON email_sequences FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY email_sequence_emails_admin ON email_sequence_emails FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY email_enrollments_admin ON email_sequence_enrollments FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY email_sends_admin ON email_sends FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY social_posts_admin ON automation_social_posts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY engagement_admin ON user_engagement_scores FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY upgrade_opp_admin ON upgrade_opportunities FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY churn_risk_admin ON churn_risks FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY ad_campaigns_admin ON ad_campaigns FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY notifications_own ON admin_notifications FOR ALL USING (recipient_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));

-- Seed the 4 email sequences
INSERT INTO email_sequences (name, trigger_event, total_emails) VALUES
  ('New Signup Welcome', 'user_signup', 9),
  ('Trial to Paid Conversion', 'trial_active_3_logins', 3),
  ('Post-Upgrade Onboarding', 'user_upgraded', 4),
  ('Payment Failed Dunning', 'payment_failed', 4)
ON CONFLICT DO NOTHING;

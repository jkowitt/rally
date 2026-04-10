-- Onboarding progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  current_step integer DEFAULT 0,
  completed_steps integer[] DEFAULT '{}',
  onboarding_completed boolean DEFAULT false,
  completed_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding_progress(onboarding_completed);

-- Checklist items persisted across sessions
CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_checklist_user ON onboarding_checklist_items(user_id);

-- Upgrade prompt event tracking for analytics
CREATE TABLE IF NOT EXISTS upgrade_prompt_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  trigger_event text NOT NULL,
  target_plan text,
  shown_at timestamptz DEFAULT now(),
  dismissed_at timestamptz,
  converted boolean DEFAULT false,
  converted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upgrade_events_user ON upgrade_prompt_events(user_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_events_trigger ON upgrade_prompt_events(trigger_event, shown_at DESC);

-- Add columns to properties for billing grace period and day-25 prompt
ALTER TABLE properties ADD COLUMN IF NOT EXISTS billing_grace_period_until timestamptz;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz;

-- Add columns to profiles for onboarding state
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_skipped boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shown_day25_prompt boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tooltip_tour_completed boolean DEFAULT false;

-- Upgrade offers sent by admin (manual enterprise offers)
CREATE TABLE IF NOT EXISTS upgrade_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid REFERENCES profiles(id),
  recipient_email text NOT NULL,
  custom_message text,
  offer_type text,
  stripe_link text,
  email_sent_at timestamptz DEFAULT now(),
  email_opened_at timestamptz,
  link_clicked_at timestamptz,
  upgraded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_prompt_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_progress_own ON onboarding_progress FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

CREATE POLICY checklist_own ON onboarding_checklist_items FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

CREATE POLICY upgrade_events_own ON upgrade_prompt_events FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

CREATE POLICY upgrade_offers_dev ON upgrade_offers FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

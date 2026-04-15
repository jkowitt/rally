-- ============================================================
-- MANUAL CATCH-UP SCRIPT — migrations 051 through 062
-- ============================================================
-- Use this file ONLY if the supabase-deploy GitHub Actions
-- workflow has been failing and your production database is
-- missing these migrations.
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard
--   2. Go to SQL Editor → New Query
--   3. Paste this entire file
--   4. Click "Run"
--
-- This file is safe to re-run — every CREATE TABLE uses
-- IF NOT EXISTS, every DROP POLICY uses IF EXISTS, every
-- INSERT uses ON CONFLICT DO NOTHING. You can paste it as
-- many times as you want.
--
-- PREFLIGHT: drop the feature_flags CHECK constraint from
-- migration 045 FIRST so migrations 053/054's inserts don't
-- fail before the rest of the script even runs.
-- ============================================================

alter table feature_flags drop constraint if exists feature_flags_module_check;



-- ============================================================
-- ▼ ▼ ▼  051_automation_engine.sql  ▼ ▼ ▼
-- ============================================================

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


-- ============================================================
-- ▼ ▼ ▼  052_client_growth_tools.sql  ▼ ▼ ▼
-- ============================================================

-- Phase 1: Fix broken RLS on biz_* tables (data leakage blocker)
-- Phase 2: Add property_id to enable multi-tenant client-facing features
-- Phase 3: Add growth workbook and strategic workbook tables

-- ─── Fix broken RLS on financial projections tables ───
-- Wrapped in DO block with exception handling so a missing biz_*
-- table (e.g. on a DB where migration 036 never ran) doesn't
-- block the whole migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biz_projections') THEN
    ALTER TABLE biz_projections ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
    DROP POLICY IF EXISTS biz_projections_ops ON biz_projections;
    DROP POLICY IF EXISTS biz_projections_access ON biz_projections;
    CREATE POLICY biz_projections_access ON biz_projections FOR ALL USING (
      property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biz_ad_campaigns') THEN
    ALTER TABLE biz_ad_campaigns ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
    DROP POLICY IF EXISTS biz_ad_campaigns_ops ON biz_ad_campaigns;
    DROP POLICY IF EXISTS biz_ad_campaigns_access ON biz_ad_campaigns;
    CREATE POLICY biz_ad_campaigns_access ON biz_ad_campaigns FOR ALL USING (
      property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biz_reports') THEN
    ALTER TABLE biz_reports ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
    DROP POLICY IF EXISTS biz_reports_ops ON biz_reports;
    DROP POLICY IF EXISTS biz_reports_access ON biz_reports;
    CREATE POLICY biz_reports_access ON biz_reports FOR ALL USING (
      property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
    );
  END IF;
END $$;

-- ─── Add property_id to other biz_* tables for multi-tenancy ───
-- Also wrapped in DO block so missing tables don't break the migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biz_goals') THEN
    ALTER TABLE biz_goals ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
    DROP POLICY IF EXISTS biz_goals_ops ON biz_goals;
    DROP POLICY IF EXISTS biz_goals_access ON biz_goals;
    CREATE POLICY biz_goals_access ON biz_goals FOR ALL USING (
      property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
      OR property_id IS NULL
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biz_connections') THEN
    ALTER TABLE biz_connections ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
    DROP POLICY IF EXISTS biz_connections_ops ON biz_connections;
    DROP POLICY IF EXISTS biz_connections_access ON biz_connections;
    CREATE POLICY biz_connections_access ON biz_connections FOR ALL USING (
      property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
      OR property_id IS NULL
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'biz_finances') THEN
    ALTER TABLE biz_finances ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
    DROP POLICY IF EXISTS biz_finances_ops ON biz_finances;
    DROP POLICY IF EXISTS biz_finances_access ON biz_finances;
    CREATE POLICY biz_finances_access ON biz_finances FOR ALL USING (
      property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
      OR property_id IS NULL
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
    );
  END IF;
END $$;

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


-- ============================================================
-- ▼ ▼ ▼  053_developer_outlook_integration.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 053 — DEVELOPER-ONLY OUTLOOK INTEGRATION
-- ============================================================
-- Private to the developer role. Every table, policy, and flag
-- in this migration is gated to is_developer() = true.
-- No other role may read, write, or even see these objects exist.
-- ============================================================

-- ========================
-- 1. OUTLOOK OAUTH TOKENS
-- ========================
create table if not exists outlook_auth (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text,           -- encrypted at app layer (see encryptToken in service)
  refresh_token text,          -- encrypted at app layer
  token_expires_at timestamptz,
  outlook_email text,
  outlook_display_name text,
  is_connected boolean not null default false,
  connected_at timestamptz,
  last_synced_at timestamptz,
  last_delta_link text,        -- for Microsoft Graph delta queries
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table outlook_auth enable row level security;

create policy "outlook_auth_dev_select" on outlook_auth
  for select using (is_developer());
create policy "outlook_auth_dev_insert" on outlook_auth
  for insert with check (is_developer());
create policy "outlook_auth_dev_update" on outlook_auth
  for update using (is_developer());
create policy "outlook_auth_dev_delete" on outlook_auth
  for delete using (is_developer());

-- ========================
-- 2. SYNCED EMAILS
-- ========================
create table if not exists outlook_emails (
  id uuid primary key default gen_random_uuid(),
  outlook_message_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text,
  body_preview text,
  body_html text,
  body_text text,
  from_email text,
  from_name text,
  to_emails text[] default '{}',
  cc_emails text[] default '{}',
  received_at timestamptz,
  sent_at timestamptz,
  is_sent boolean not null default false,
  is_read boolean not null default false,
  has_attachments boolean not null default false,
  folder text,                            -- 'inbox' | 'sent' | 'drafts'
  linked_contact_id uuid references contacts(id) on delete set null,
  linked_deal_id uuid references deals(id) on delete set null,
  auto_linked boolean not null default false,
  manually_linked boolean not null default false,
  ignored boolean not null default false, -- user marked as ignore
  crm_logged boolean not null default false,
  crm_logged_at timestamptz,
  sync_source text,                       -- 'auto' | 'manual'
  conversation_id text,                   -- for threading
  created_at timestamptz not null default now()
);

create index if not exists idx_outlook_emails_user on outlook_emails(user_id);
create index if not exists idx_outlook_emails_received on outlook_emails(received_at desc);
create index if not exists idx_outlook_emails_from on outlook_emails(from_email);
create index if not exists idx_outlook_emails_folder on outlook_emails(folder);
create index if not exists idx_outlook_emails_linked_deal on outlook_emails(linked_deal_id);
create index if not exists idx_outlook_emails_linked_contact on outlook_emails(linked_contact_id);
create index if not exists idx_outlook_emails_unlinked on outlook_emails(linked_contact_id, ignored)
  where linked_contact_id is null and ignored = false;

alter table outlook_emails enable row level security;

create policy "outlook_emails_dev_select" on outlook_emails
  for select using (is_developer());
create policy "outlook_emails_dev_insert" on outlook_emails
  for insert with check (is_developer());
create policy "outlook_emails_dev_update" on outlook_emails
  for update using (is_developer());
create policy "outlook_emails_dev_delete" on outlook_emails
  for delete using (is_developer());

-- ========================
-- 3. SYNC LOG
-- ========================
create table if not exists outlook_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  sync_type text not null,                -- 'full' | 'delta' | 'manual'
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  emails_synced integer not null default 0,
  emails_linked integer not null default 0,
  errors jsonb default '[]'::jsonb,
  status text not null default 'running'  -- 'running' | 'complete' | 'failed'
);

create index if not exists idx_outlook_sync_log_started on outlook_sync_log(started_at desc);

alter table outlook_sync_log enable row level security;

create policy "outlook_sync_log_dev_select" on outlook_sync_log
  for select using (is_developer());
create policy "outlook_sync_log_dev_insert" on outlook_sync_log
  for insert with check (is_developer());
create policy "outlook_sync_log_dev_update" on outlook_sync_log
  for update using (is_developer());
create policy "outlook_sync_log_dev_delete" on outlook_sync_log
  for delete using (is_developer());

-- ========================
-- 4. PERSONAL OUTREACH PROSPECTS
-- ========================
-- IMPORTANT: This table is strictly for Loud Legacy business
-- development outreach. It MUST NOT reference or mix with any
-- customer (Van Wagner, etc.) CRM data. No property_id,
-- no deal_id, no contact_id — fully isolated.
create table if not exists outlook_prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text not null,
  organization text,
  title text,
  industry text,                          -- 'conference_events' | 'minor_league_sports'
  linkedin_url text,
  outreach_status text not null default 'not_contacted',
    -- not_contacted | contacted | responded | demo_scheduled
    -- | trial_started | converted | not_interested
  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  last_email_subject text,
  follow_up_due date,
  notes text,
  signed_up boolean not null default false,
  signed_up_at timestamptz,
  converted_to_paid boolean not null default false,
  converted_at timestamptz,
  plan_converted_to text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, email)
);

create index if not exists idx_outlook_prospects_status on outlook_prospects(outreach_status);
create index if not exists idx_outlook_prospects_follow_up on outlook_prospects(follow_up_due)
  where outreach_status in ('contacted', 'responded');
create index if not exists idx_outlook_prospects_email on outlook_prospects(lower(email));

alter table outlook_prospects enable row level security;

create policy "outlook_prospects_dev_select" on outlook_prospects
  for select using (is_developer());
create policy "outlook_prospects_dev_insert" on outlook_prospects
  for insert with check (is_developer());
create policy "outlook_prospects_dev_update" on outlook_prospects
  for update using (is_developer());
create policy "outlook_prospects_dev_delete" on outlook_prospects
  for delete using (is_developer());

-- ========================
-- 5. OUTREACH TEMPLATES
-- ========================
create table if not exists outlook_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  industry text,                          -- 'conference_events' | 'minor_league_sports' | 'both'
  stage text,                             -- 'initial' | 'follow_up_1' | 'follow_up_2' | 'demo_request' | 'post_demo' | 'trial_follow_up'
  is_seeded boolean not null default false,
  times_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_outlook_templates_stage on outlook_templates(stage);

alter table outlook_templates enable row level security;

create policy "outlook_templates_dev_select" on outlook_templates
  for select using (is_developer());
create policy "outlook_templates_dev_insert" on outlook_templates
  for insert with check (is_developer());
create policy "outlook_templates_dev_update" on outlook_templates
  for update using (is_developer());
create policy "outlook_templates_dev_delete" on outlook_templates
  for delete using (is_developer());

-- ========================
-- 6. TEMPLATE USAGE LOG (for analytics)
-- ========================
create table if not exists outlook_template_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references outlook_templates(id) on delete set null,
  prospect_id uuid references outlook_prospects(id) on delete set null,
  sent_at timestamptz not null default now(),
  got_response boolean not null default false,
  got_response_at timestamptz,
  resulted_in_demo boolean not null default false,
  resulted_in_trial boolean not null default false,
  resulted_in_paid boolean not null default false
);

create index if not exists idx_outlook_template_usage_template on outlook_template_usage(template_id);
create index if not exists idx_outlook_template_usage_sent on outlook_template_usage(sent_at desc);

alter table outlook_template_usage enable row level security;

create policy "outlook_template_usage_dev_select" on outlook_template_usage
  for select using (is_developer());
create policy "outlook_template_usage_dev_insert" on outlook_template_usage
  for insert with check (is_developer());
create policy "outlook_template_usage_dev_update" on outlook_template_usage
  for update using (is_developer());
create policy "outlook_template_usage_dev_delete" on outlook_template_usage
  for delete using (is_developer());

-- ========================
-- 7. FEATURE FLAG ROW
-- ========================
-- Hidden feature flag. Never listed in the standard flags UI.
-- Default OFF. Only the developer console at /dev/feature-flags
-- exposes this row.
--
-- IMPORTANT: drop the feature_flags_module_check CHECK constraint
-- from migration 045 FIRST. That constraint had a hardcoded enum
-- of allowed module names and 'outlook_integration' is not in it,
-- so the INSERT below would fail with error 23514. 'on conflict'
-- does NOT catch check constraint violations — it only handles
-- unique constraint conflicts. Dropping the constraint is the
-- right long-term fix because new feature flags should not
-- require a DB migration (see migration 058 which also drops
-- this, now doubled up for safety).
alter table feature_flags drop constraint if exists feature_flags_module_check;

insert into feature_flags (module, enabled, updated_at)
values ('outlook_integration', false, now())
on conflict (module) do nothing;

-- ========================
-- 8. CONTACT LAST-CONTACTED COLUMN
-- ========================
-- Used by sync to update the standard Loud Legacy contact card.
-- Adds the column only if it isn't already there.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'contacts' and column_name = 'last_contacted_at'
  ) then
    alter table contacts add column last_contacted_at timestamptz;
  end if;
end $$;

-- ========================
-- 9. SEED DEFAULT TEMPLATES
-- ========================
-- Templates are seeded the first time the developer visits
-- /dev/outlook/templates (via templateService.seedIfEmpty).
-- No hardcoded seeds in SQL so content can be iterated in JS.

-- ========================
-- DONE
-- ========================


-- ============================================================
-- ▼ ▼ ▼  054_email_marketing_system.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 054 — EMAIL MARKETING SYSTEM
-- ============================================================
-- Developer-only (flag: email_marketing_developer) until
-- email_marketing_public is toggled on. When public is on, the
-- public RLS policies also allow admin+ roles per organization.
--
-- Reuses existing tables:
--   - contacts   (pipeline source)
--   - deals      (deal_stage + deal_value for subscribers)
--   - activities (CRM activity integration)
--   - feature_flags (hidden flags defined in code via HIDDEN_MODULES)
-- Does NOT touch:
--   - email_sequences, email_sequence_emails,
--     email_sequence_enrollments, email_sends (migration 051)
-- ============================================================

-- ========================
-- HELPER: can_access_email_marketing()
-- ========================
-- Returns true when:
--   (a) caller is developer AND email_marketing_developer flag is ON, OR
--   (b) email_marketing_public flag is ON AND caller is admin+ role
--       AND the row belongs to their property/organization.
-- For property scoping in the public case, individual policies add
-- their own `property_id = get_user_property_id()` check.
create or replace function can_access_email_marketing_dev()
returns boolean as $$
  select is_developer() and coalesce(
    (select enabled from feature_flags where module = 'email_marketing_developer'),
    false
  )
$$ language sql security definer stable;

create or replace function can_access_email_marketing_public()
returns boolean as $$
  select coalesce(
    (select enabled from feature_flags where module = 'email_marketing_public'),
    false
  ) and exists(
    select 1 from profiles
    where id = auth.uid() and role in ('developer', 'businessops', 'admin')
  )
$$ language sql security definer stable;

create or replace function can_access_email_marketing()
returns boolean as $$
  select can_access_email_marketing_dev() or can_access_email_marketing_public()
$$ language sql security definer stable;

-- ========================
-- 1. EMAIL LISTS
-- ========================
create table if not exists email_lists (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  description text,
  list_type text not null default 'custom',
    -- 'prospect' | 'trial' | 'customer' | 'newsletter'
    -- | 'segment' | 'pipeline' | 'custom'
  is_dynamic boolean not null default false,
  dynamic_rules jsonb default '{}'::jsonb,
  subscriber_count integer not null default 0,
  active_count integer not null default 0,
  unsubscribed_count integer not null default 0,
  bounced_count integer not null default 0,
  tags text[] default '{}',
  is_public boolean not null default false,
  is_pipeline_list boolean not null default false,
  last_campaign_sent_at timestamptz,
  last_synced_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_lists_property on email_lists(property_id);
create index if not exists idx_email_lists_type on email_lists(list_type);

alter table email_lists enable row level security;

create policy "email_lists_dev_select" on email_lists
  for select using (
    can_access_email_marketing_dev()
    or (can_access_email_marketing_public() and (property_id is null or property_id = get_user_property_id()))
  );
create policy "email_lists_dev_insert" on email_lists
  for insert with check (can_access_email_marketing());
create policy "email_lists_dev_update" on email_lists
  for update using (can_access_email_marketing());
create policy "email_lists_dev_delete" on email_lists
  for delete using (can_access_email_marketing());

-- ========================
-- 2. EMAIL SUBSCRIBERS
-- ========================
create table if not exists email_subscribers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  organization text,
  title text,
  industry text,
  phone text,
  linkedin_url text,
  source text not null default 'manual',
    -- 'manual' | 'import' | 'signup' | 'outlook_sync'
    -- | 'pipeline_sync' | 'api'
  status text not null default 'active',
    -- 'active' | 'unsubscribed' | 'bounced' | 'complained' | 'cleaned'
  global_unsubscribe boolean not null default false,
  unsubscribed_at timestamptz,
  unsubscribe_reason text,
  bounce_type text,
  bounced_at timestamptz,
  tags text[] default '{}',
  custom_fields jsonb default '{}'::jsonb,
  loud_legacy_user_id uuid references auth.users(id) on delete set null,
  loud_legacy_plan text,
  crm_contact_id uuid references contacts(id) on delete set null,
  crm_synced boolean not null default false,
  crm_synced_at timestamptz,
  crm_sync_source text,
  is_recent_add boolean not null default false,
  recent_add_flagged_at timestamptz,
  recent_add_cleared_at timestamptz,
  deal_stage text,
  deal_value numeric,
  engagement_score integer not null default 0,
  last_opened_at timestamptz,
  last_clicked_at timestamptz,
  total_opens integer not null default 0,
  total_clicks integer not null default 0,
  last_replied_at timestamptz,
  total_replies integer not null default 0,
  unsubscribe_token text unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, email)
);

create index if not exists idx_email_subscribers_email on email_subscribers(lower(email));
create index if not exists idx_email_subscribers_status on email_subscribers(status);
create index if not exists idx_email_subscribers_crm_contact on email_subscribers(crm_contact_id);
create index if not exists idx_email_subscribers_recent_adds on email_subscribers(recent_add_flagged_at desc) where is_recent_add = true;
create index if not exists idx_email_subscribers_unsubscribe_token on email_subscribers(unsubscribe_token);
create index if not exists idx_email_subscribers_property on email_subscribers(property_id);

alter table email_subscribers enable row level security;

create policy "email_subscribers_select" on email_subscribers
  for select using (
    can_access_email_marketing_dev()
    or (can_access_email_marketing_public() and (property_id is null or property_id = get_user_property_id()))
  );
create policy "email_subscribers_insert" on email_subscribers
  for insert with check (can_access_email_marketing());
create policy "email_subscribers_update" on email_subscribers
  for update using (can_access_email_marketing());
create policy "email_subscribers_delete" on email_subscribers
  for delete using (can_access_email_marketing());

-- ========================
-- 3. LIST MEMBERSHIP
-- ========================
create table if not exists email_list_subscribers (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references email_lists(id) on delete cascade,
  subscriber_id uuid not null references email_subscribers(id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  source text,
  status text not null default 'active',
  is_recent_add boolean not null default false,
  recent_add_flagged_at timestamptz,
  unique(list_id, subscriber_id)
);

create index if not exists idx_list_subscribers_list on email_list_subscribers(list_id);
create index if not exists idx_list_subscribers_subscriber on email_list_subscribers(subscriber_id);

alter table email_list_subscribers enable row level security;

create policy "list_subscribers_all" on email_list_subscribers
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 4. SUBSCRIBER EVENTS
-- ========================
create table if not exists email_subscriber_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references email_subscribers(id) on delete cascade,
  event_type text not null,
    -- 'subscribed' | 'unsubscribed' | 'bounced' | 'complained'
    -- | 'opened' | 'clicked' | 'converted' | 'pipeline_synced'
    -- | 'replied' | 'conversation_started'
  campaign_id uuid,
  metadata jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_subscriber_events_subscriber on email_subscriber_events(subscriber_id, occurred_at desc);
create index if not exists idx_subscriber_events_type on email_subscriber_events(event_type);

alter table email_subscriber_events enable row level security;

create policy "subscriber_events_all" on email_subscriber_events
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 5. TAGS
-- ========================
create table if not exists email_tags (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  color text default '#E8B84B',
  subscriber_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(property_id, name)
);

alter table email_tags enable row level security;

create policy "email_tags_all" on email_tags
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 6. PIPELINE SYNC SETTINGS
-- ========================
create table if not exists pipeline_sync_settings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  auto_sync_enabled boolean not null default true,
  auto_sync_target_list_ids uuid[] default '{}',
  sync_all_contacts boolean not null default true,
  sync_by_deal_stage text[] default '{}',
  sync_by_industry text[] default '{}',
  recent_add_display_hours integer not null default 72,
  last_bulk_sync_at timestamptz,
  total_synced integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id)
);

alter table pipeline_sync_settings enable row level security;

create policy "pipeline_sync_settings_all" on pipeline_sync_settings
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 7. PIPELINE SYNC LOG
-- ========================
create table if not exists pipeline_sync_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  sync_type text not null,
  contact_id uuid references contacts(id) on delete set null,
  subscriber_id uuid references email_subscribers(id) on delete set null,
  action text not null,
  skip_reason text,
  synced_at timestamptz not null default now(),
  synced_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_pipeline_sync_log_synced on pipeline_sync_log(synced_at desc);

alter table pipeline_sync_log enable row level security;

create policy "pipeline_sync_log_all" on pipeline_sync_log
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 8. EMAIL TEMPLATES
-- ========================
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'custom',
    -- 'newsletter' | 'promotional' | 'transactional'
    -- | 'drip' | 'announcement' | 'custom'
  subject_line text,
  preview_text text,
  html_content text,
  plain_text_content text,
  json_structure jsonb,
  thumbnail_url text,
  is_system_template boolean not null default false,
  tags text[] default '{}',
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table email_templates enable row level security;

create policy "email_templates_all" on email_templates
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 9. EMAIL CAMPAIGNS
-- ========================
create table if not exists email_campaigns (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  subject_line text not null,
  preview_text text,
  from_name text,
  from_email text,
  reply_to_email text,
  template_id uuid references email_templates(id) on delete set null,
  html_content text,
  plain_text_content text,
  list_ids uuid[] default '{}',
  segment_filters jsonb default '{}'::jsonb,
  exclude_list_ids uuid[] default '{}',
  status text not null default 'draft',
    -- 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
  campaign_type text not null default 'regular',
    -- 'regular' | 'ab_test' | 'automated'
  ab_variant_subject text,
  ab_variant_html text,
  ab_split_percent integer default 50,
  ab_winner_criterion text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  total_recipients integer not null default 0,
  emails_sent integer not null default 0,
  emails_delivered integer not null default 0,
  unique_opens integer not null default 0,
  unique_clicks integer not null default 0,
  emails_bounced integer not null default 0,
  emails_unsubscribed integer not null default 0,
  emails_complained integer not null default 0,
  reply_count integer not null default 0,
  open_rate numeric not null default 0,
  click_rate numeric not null default 0,
  reply_rate numeric not null default 0,
  bounce_rate numeric not null default 0,
  revenue_attributed numeric not null default 0,
  tags text[] default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_status on email_campaigns(status);
create index if not exists idx_campaigns_scheduled on email_campaigns(scheduled_for) where status = 'scheduled';

alter table email_campaigns enable row level security;

create policy "email_campaigns_all" on email_campaigns
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 10. CAMPAIGN SENDS
-- ========================
create table if not exists email_campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references email_campaigns(id) on delete cascade,
  subscriber_id uuid references email_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'pending',
    -- 'pending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
  sent_at timestamptz,
  opened_at timestamptz,
  first_opened_at timestamptz,
  open_count integer not null default 0,
  clicked_at timestamptz,
  click_count integer not null default 0,
  replied_at timestamptz,
  conversation_id uuid,
  bounced_at timestamptz,
  bounce_type text,
  unsubscribed_at timestamptz,
  tracking_pixel_id text unique default encode(gen_random_bytes(16), 'hex'),
  message_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_sends_campaign on email_campaign_sends(campaign_id);
create index if not exists idx_campaign_sends_subscriber on email_campaign_sends(subscriber_id);
create index if not exists idx_campaign_sends_tracking on email_campaign_sends(tracking_pixel_id);
create index if not exists idx_campaign_sends_message_id on email_campaign_sends(message_id);

alter table email_campaign_sends enable row level security;

create policy "campaign_sends_all" on email_campaign_sends
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 11. CAMPAIGN TRACKED LINKS
-- ========================
create table if not exists email_campaign_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references email_campaigns(id) on delete cascade,
  original_url text not null,
  tracking_token text unique not null default encode(gen_random_bytes(12), 'hex'),
  click_count integer not null default 0,
  unique_clicks integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_links_token on email_campaign_links(tracking_token);

alter table email_campaign_links enable row level security;

create policy "campaign_links_all" on email_campaign_links
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 12. CONVERSATIONS
-- ========================
create table if not exists email_conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  subscriber_id uuid references email_subscribers(id) on delete set null,
  crm_contact_id uuid references contacts(id) on delete set null,
  crm_deal_id uuid references deals(id) on delete set null,
  campaign_id uuid references email_campaigns(id) on delete set null,
  sequence_id uuid, -- references email_sequences from migration 051
  subject text,
  status text not null default 'open',
    -- 'open' | 'replied' | 'closed' | 'archived'
  priority text not null default 'normal',
    -- 'normal' | 'high' | 'urgent'
  assigned_to uuid references auth.users(id) on delete set null,
  tags text[] default '{}',
  last_message_at timestamptz not null default now(),
  last_message_from text not null default 'subscriber',
  message_count integer not null default 0,
  unread_count integer not null default 0,
  is_crm_activity_created boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_status on email_conversations(status);
create index if not exists idx_conversations_last_msg on email_conversations(last_message_at desc);
create index if not exists idx_conversations_subscriber on email_conversations(subscriber_id);

alter table email_conversations enable row level security;

create policy "conversations_all" on email_conversations
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 13. CONVERSATION MESSAGES
-- ========================
create table if not exists email_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references email_conversations(id) on delete cascade,
  direction text not null, -- 'inbound' | 'outbound'
  from_email text,
  from_name text,
  to_email text,
  subject text,
  body_html text,
  body_text text,
  is_read boolean not null default false,
  read_at timestamptz,
  provider_message_id text,
  in_reply_to text,
  attachments jsonb,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_conv_messages_conversation on email_conversation_messages(conversation_id, created_at);
create index if not exists idx_conv_messages_provider_id on email_conversation_messages(provider_message_id);

alter table email_conversation_messages enable row level security;

create policy "conv_messages_all" on email_conversation_messages
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 14. CONVERSATION NOTES
-- ========================
create table if not exists email_conversation_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references email_conversations(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table email_conversation_notes enable row level security;

create policy "conv_notes_all" on email_conversation_notes
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 15. SUPPRESSION LIST (global hard opt-outs)
-- ========================
create table if not exists email_suppression_list (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text not null default 'unsubscribed',
    -- 'unsubscribed' | 'hard_bounce' | 'complained' | 'manual'
  added_at timestamptz not null default now()
);

create index if not exists idx_suppression_email on email_suppression_list(lower(email));

alter table email_suppression_list enable row level security;

create policy "suppression_all" on email_suppression_list
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

-- ========================
-- 16. FEATURE FLAG SEED ROWS
-- ========================
-- Same CHECK constraint issue as migration 053. Drop it again in
-- case this migration runs standalone on a DB where 053 hasn't
-- been applied yet. Idempotent — safe if already dropped.
alter table feature_flags drop constraint if exists feature_flags_module_check;

insert into feature_flags (module, enabled, updated_at)
values
  ('email_marketing_developer', false, now()),
  ('email_marketing_public', false, now())
on conflict (module) do nothing;

-- ========================
-- 17. TRIGGER: new contact → mark for sync
-- ========================
-- Sets a flag in a small queue table so the pipeline-sync edge
-- function can pick up new contacts. We deliberately DO NOT call
-- an edge function from a DB trigger (that path is flaky) — instead
-- we enqueue and let a cron-based sync drain the queue.
create table if not exists pipeline_sync_queue (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  enqueued_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(contact_id)
);

create index if not exists idx_pipeline_sync_queue_pending on pipeline_sync_queue(enqueued_at)
  where processed_at is null;

alter table pipeline_sync_queue enable row level security;
create policy "pipeline_sync_queue_all" on pipeline_sync_queue
  for all using (can_access_email_marketing()) with check (can_access_email_marketing());

create or replace function enqueue_contact_for_email_sync()
returns trigger as $$
begin
  insert into pipeline_sync_queue (contact_id)
  values (new.id)
  on conflict (contact_id) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists contacts_enqueue_email_sync on contacts;
create trigger contacts_enqueue_email_sync
  after insert or update of email on contacts
  for each row execute function enqueue_contact_for_email_sync();

-- ========================
-- DONE
-- ========================


-- ============================================================
-- ▼ ▼ ▼  055_pricing_architecture.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 055 — PRICING ARCHITECTURE (DB-driven)
-- ============================================================
-- Moves every price, limit, feature flag, credit cost, addon, and
-- pricing-page content string into the database. planLimits.js
-- becomes a thin client that reads from here with a 5-minute cache.
--
-- Base plan prices NEVER change in code:
--   Free $0 / Starter $39/mo / Pro $199/mo / Enterprise custom
-- Existing customers are grandfathered automatically — see the
-- organization_ai_credits + organization_addons tables for per-org
-- overrides.
-- ============================================================

-- ========================
-- 1. PRICING PLANS
-- ========================
create table if not exists pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  display_name text not null,
  tagline text,
  monthly_price_cents integer not null default 0,
  annual_price_cents integer not null default 0,
  annual_savings_text text,
  stripe_monthly_price_id text,
  stripe_annual_price_id text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  cta_text text default 'Start free trial',
  cta_url text default '/login',
  color_accent text default '#E8B84B',
  badge_text text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pricing_plans enable row level security;
create policy "pricing_plans_select" on pricing_plans for select using (true);
create policy "pricing_plans_write" on pricing_plans for all using (is_developer()) with check (is_developer());

-- ========================
-- 2. PLAN LIMITS
-- ========================
create table if not exists plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references pricing_plans(id) on delete cascade,
  limit_key text not null,
  limit_display_name text,
  limit_value integer not null default 0, -- -1 means unlimited
  limit_type text not null default 'hard', -- 'hard' | 'soft'
  reset_period text not null default 'monthly', -- 'monthly' | 'daily' | 'never' | 'per_seat'
  show_on_pricing_page boolean not null default true,
  pricing_page_display text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, limit_key)
);

create index if not exists idx_plan_limits_plan on plan_limits(plan_id);

alter table plan_limits enable row level security;
create policy "plan_limits_select" on plan_limits for select using (true);
create policy "plan_limits_write" on plan_limits for all using (is_developer()) with check (is_developer());

-- ========================
-- 3. PLAN FEATURES (boolean flags)
-- ========================
create table if not exists plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references pricing_plans(id) on delete cascade,
  feature_key text not null,
  feature_display_name text,
  feature_description text,
  is_enabled boolean not null default false,
  show_on_pricing_page boolean not null default true,
  pricing_page_category text default 'Core CRM',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, feature_key)
);

create index if not exists idx_plan_features_plan on plan_features(plan_id);

alter table plan_features enable row level security;
create policy "plan_features_select" on plan_features for select using (true);
create policy "plan_features_write" on plan_features for all using (is_developer()) with check (is_developer());

-- ========================
-- 4. AI CREDIT PACKS (add-on SKUs)
-- ========================
create table if not exists ai_credit_packs (
  id uuid primary key default gen_random_uuid(),
  pack_key text not null unique,
  display_name text not null,
  credit_amount integer not null,
  monthly_price_cents integer not null default 0,
  one_time_price_cents integer not null default 0,
  stripe_price_id text,
  stripe_one_time_price_id text,
  description text,
  best_for_text text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ai_credit_packs enable row level security;
create policy "ai_credit_packs_select" on ai_credit_packs for select using (true);
create policy "ai_credit_packs_write" on ai_credit_packs for all using (is_developer()) with check (is_developer());

-- ========================
-- 5. AI CREDIT COSTS (per feature)
-- ========================
create table if not exists ai_credit_costs (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  feature_display_name text not null,
  credits_per_use integer not null default 1,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ai_credit_costs enable row level security;
-- Authenticated users can read costs (they need to see the price before clicking);
-- only developers can write.
create policy "ai_credit_costs_select" on ai_credit_costs
  for select using (auth.role() = 'authenticated' or is_developer());
create policy "ai_credit_costs_write" on ai_credit_costs
  for all using (is_developer()) with check (is_developer());

-- ========================
-- 6. ORGANIZATION AI CREDITS (per-org balance)
-- ========================
create table if not exists organization_ai_credits (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  plan_credits_remaining integer not null default 0,
  purchased_credits_remaining integer not null default 0,
  total_credits_used_this_period integer not null default 0,
  period_start timestamptz not null default now(),
  period_end timestamptz not null default (now() + interval '1 month'),
  last_reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id)
);

create index if not exists idx_org_credits_property on organization_ai_credits(property_id);

alter table organization_ai_credits enable row level security;
create policy "org_credits_select" on organization_ai_credits
  for select using (is_developer() or property_id = get_user_property_id());
create policy "org_credits_insert" on organization_ai_credits
  for insert with check (is_developer() or property_id = get_user_property_id());
create policy "org_credits_update" on organization_ai_credits
  for update using (is_developer() or property_id = get_user_property_id());

-- ========================
-- 7. AI CREDIT TRANSACTIONS (audit log)
-- ========================
create table if not exists ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  transaction_type text not null, -- 'plan_allocation' | 'purchase' | 'usage' | 'refund' | 'adjustment'
  feature_key text,
  credits_delta integer not null,
  credits_before integer not null default 0,
  credits_after integer not null default 0,
  description text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_tx_property on ai_credit_transactions(property_id, created_at desc);

alter table ai_credit_transactions enable row level security;
create policy "credit_tx_select" on ai_credit_transactions
  for select using (is_developer() or property_id = get_user_property_id());
create policy "credit_tx_insert" on ai_credit_transactions
  for insert with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 8. ADDONS CATALOG
-- ========================
create table if not exists addons (
  id uuid primary key default gen_random_uuid(),
  addon_key text not null unique,
  display_name text not null,
  description text,
  long_description text,
  monthly_price_cents integer not null default 0,
  annual_price_cents integer,
  stripe_monthly_price_id text,
  stripe_annual_price_id text,
  icon text default '✨',
  badge_text text,
  available_for_plans text[] default '{}',
  features_unlocked text[] default '{}',
  limits_increased jsonb default '{}'::jsonb,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table addons enable row level security;
create policy "addons_select" on addons for select using (true);
create policy "addons_write" on addons for all using (is_developer()) with check (is_developer());

-- ========================
-- 9. ORGANIZATION ADDONS (per-org activations)
-- ========================
create table if not exists organization_addons (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  addon_id uuid not null references addons(id) on delete cascade,
  addon_key text not null,
  status text not null default 'active', -- 'active' | 'cancelled' | 'paused'
  billing_period text not null default 'monthly', -- 'monthly' | 'annual'
  stripe_subscription_item_id text,
  activated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancels_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, addon_id)
);

create index if not exists idx_org_addons_property on organization_addons(property_id);

alter table organization_addons enable row level security;
create policy "org_addons_select" on organization_addons
  for select using (is_developer() or property_id = get_user_property_id());
create policy "org_addons_write" on organization_addons
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 10. ORGANIZATION BILLING (monthly/annual period tracking)
-- ========================
create table if not exists organization_billing (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references properties(id) on delete cascade,
  billing_period text not null default 'monthly', -- 'monthly' | 'annual'
  plan_key text not null default 'free',
  monthly_base_price_cents integer not null default 0,
  annual_base_price_cents integer not null default 0,
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  next_invoice_amount_cents integer,
  cancels_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_billing_property on organization_billing(property_id);

alter table organization_billing enable row level security;
create policy "org_billing_select" on organization_billing
  for select using (is_developer() or property_id = get_user_property_id());
create policy "org_billing_write" on organization_billing
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 11. PRICING PAGE CONFIG (content strings)
-- ========================
create table if not exists pricing_page_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  config_value text,
  config_type text not null default 'text', -- 'text' | 'boolean' | 'number' | 'json'
  description text,
  category text default 'general',
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table pricing_page_config enable row level security;
create policy "pricing_config_select" on pricing_page_config for select using (true);
create policy "pricing_config_write" on pricing_page_config
  for all using (is_developer()) with check (is_developer());

-- ========================
-- 12. PRICING PAGE FAQ (separate table for CRUD ordering)
-- ========================
create table if not exists pricing_page_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pricing_page_faqs enable row level security;
create policy "pricing_faqs_select" on pricing_page_faqs for select using (true);
create policy "pricing_faqs_write" on pricing_page_faqs
  for all using (is_developer()) with check (is_developer());

-- ========================
-- 13. PRICING CHANGE HISTORY (audit log)
-- ========================
create table if not exists pricing_change_history (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid references auth.users(id) on delete set null,
  change_type text not null, -- 'plan' | 'limit' | 'feature' | 'credit_cost' | 'credit_pack' | 'addon' | 'page'
  entity_type text,
  entity_key text,
  field_name text,
  previous_value text,
  new_value text,
  change_summary text,
  customers_affected integer default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_pricing_history_created on pricing_change_history(created_at desc);
create index if not exists idx_pricing_history_type on pricing_change_history(change_type);

alter table pricing_change_history enable row level security;
create policy "pricing_history_select" on pricing_change_history
  for select using (is_developer());
create policy "pricing_history_insert" on pricing_change_history
  for insert with check (is_developer());

-- ============================================================
-- SEED DATA — mirrors the current planLimits.js values
-- ============================================================

-- Plans
insert into pricing_plans (plan_key, display_name, tagline, monthly_price_cents, annual_price_cents, annual_savings_text, is_featured, display_order, cta_text, badge_text, description)
values
  ('free', 'Free', 'Perfect for getting started', 0, 0, null, false, 1, 'Start free', null, 'Perfect for getting started'),
  ('starter', 'Starter', 'For growing teams ready to scale', 3900, 39000, '2 months free', false, 2, 'Start free trial', null, 'For growing teams ready to scale'),
  ('pro', 'Pro', 'Full platform for serious operators', 19900, 199000, '2 months free', true, 3, 'Start free trial', 'Most Popular', 'Full platform access for serious operators'),
  ('enterprise', 'Enterprise', 'Unlimited everything plus priority support', 0, 0, null, false, 4, 'Talk to us', null, 'Unlimited everything plus priority support')
on conflict (plan_key) do nothing;

-- Helper function to seed a limit by plan_key
create or replace function seed_limit(p_plan_key text, p_limit_key text, p_display_name text, p_value integer, p_category_text text, p_order integer default 0, p_reset text default 'monthly')
returns void as $$
declare v_plan_id uuid;
begin
  select id into v_plan_id from pricing_plans where plan_key = p_plan_key;
  if v_plan_id is null then return; end if;
  insert into plan_limits (plan_id, limit_key, limit_display_name, limit_value, reset_period, pricing_page_display, display_order)
  values (v_plan_id, p_limit_key, p_display_name, p_value, p_reset,
    case when p_value = -1 then 'Unlimited'
         when p_reset = 'monthly' then p_value::text || '/mo'
         else p_value::text end,
    p_order)
  on conflict (plan_id, limit_key) do nothing;
end;
$$ language plpgsql;

-- Helper to seed features
create or replace function seed_feature(p_plan_key text, p_feature_key text, p_display text, p_enabled boolean, p_category text, p_order integer default 0)
returns void as $$
declare v_plan_id uuid;
begin
  select id into v_plan_id from pricing_plans where plan_key = p_plan_key;
  if v_plan_id is null then return; end if;
  insert into plan_features (plan_id, feature_key, feature_display_name, is_enabled, pricing_page_category, display_order)
  values (v_plan_id, p_feature_key, p_display, p_enabled, p_category, p_order)
  on conflict (plan_id, feature_key) do nothing;
end;
$$ language plpgsql;

-- Seed limits — Free
select seed_limit('free', 'deals', 'Deals', 15, 'Core', 1, 'never');
select seed_limit('free', 'users', 'Team seats', 2, 'Core', 2, 'per_seat');
select seed_limit('free', 'contract_upload', 'Contract parses', 2, 'AI', 3);
select seed_limit('free', 'prospect_search', 'Prospect searches', 3, 'AI', 4);
select seed_limit('free', 'ai_valuation', 'VALORA runs', 0, 'AI', 5);
select seed_limit('free', 'newsletter_generate', 'Newsletters', 1, 'AI', 6);
select seed_limit('free', 'ai_credits_per_month', 'AI credits', 10, 'AI', 7);

-- Seed limits — Starter
select seed_limit('starter', 'deals', 'Deals', 500, 'Core', 1, 'never');
select seed_limit('starter', 'users', 'Team seats', 5, 'Core', 2, 'per_seat');
select seed_limit('starter', 'contract_upload', 'Contract parses', 25, 'AI', 3);
select seed_limit('starter', 'prospect_search', 'Prospect searches', 50, 'AI', 4);
select seed_limit('starter', 'ai_valuation', 'VALORA runs', 25, 'AI', 5);
select seed_limit('starter', 'newsletter_generate', 'Newsletters', 10, 'AI', 6);
select seed_limit('starter', 'ai_credits_per_month', 'AI credits', 100, 'AI', 7);

-- Seed limits — Pro
select seed_limit('pro', 'deals', 'Deals', -1, 'Core', 1, 'never');
select seed_limit('pro', 'users', 'Team seats', 15, 'Core', 2, 'per_seat');
select seed_limit('pro', 'contract_upload', 'Contract parses', -1, 'AI', 3);
select seed_limit('pro', 'prospect_search', 'Prospect searches', 200, 'AI', 4);
select seed_limit('pro', 'ai_valuation', 'VALORA runs', 200, 'AI', 5);
select seed_limit('pro', 'newsletter_generate', 'Newsletters', -1, 'AI', 6);
select seed_limit('pro', 'ai_credits_per_month', 'AI credits', 500, 'AI', 7);

-- Seed limits — Enterprise
select seed_limit('enterprise', 'deals', 'Deals', -1, 'Core', 1, 'never');
select seed_limit('enterprise', 'users', 'Team seats', -1, 'Core', 2, 'per_seat');
select seed_limit('enterprise', 'contract_upload', 'Contract parses', -1, 'AI', 3);
select seed_limit('enterprise', 'prospect_search', 'Prospect searches', -1, 'AI', 4);
select seed_limit('enterprise', 'ai_valuation', 'VALORA runs', -1, 'AI', 5);
select seed_limit('enterprise', 'newsletter_generate', 'Newsletters', -1, 'AI', 6);
select seed_limit('enterprise', 'ai_credits_per_month', 'AI credits', -1, 'AI', 7);

-- Seed features — Free
select seed_feature('free', 'ai_insights', 'AI Deal Insights', false, 'AI Features', 1);
select seed_feature('free', 'fulfillment_reports', 'Fulfillment Reports', false, 'Core CRM', 2);
select seed_feature('free', 'custom_dashboard', 'Custom Dashboards', false, 'Advanced', 3);
select seed_feature('free', 'bulk_import', 'Bulk Import', false, 'Core CRM', 4);
select seed_feature('free', 'csv_export', 'CSV Export', true, 'Core CRM', 5);
select seed_feature('free', 'team_goals', 'Team Goals', false, 'Advanced', 6);
select seed_feature('free', 'advanced_automations', 'Advanced Automations', false, 'Advanced', 7);
select seed_feature('free', 'module_sportify', 'Sportify Events', false, 'Modules', 8);
select seed_feature('free', 'module_valora', 'VALORA Valuations', false, 'Modules', 9);
select seed_feature('free', 'module_businessnow', 'Business Now', false, 'Modules', 10);

-- Seed features — Starter
select seed_feature('starter', 'ai_insights', 'AI Deal Insights', true, 'AI Features', 1);
select seed_feature('starter', 'fulfillment_reports', 'Fulfillment Reports', true, 'Core CRM', 2);
select seed_feature('starter', 'custom_dashboard', 'Custom Dashboards', false, 'Advanced', 3);
select seed_feature('starter', 'bulk_import', 'Bulk Import', true, 'Core CRM', 4);
select seed_feature('starter', 'csv_export', 'CSV Export', true, 'Core CRM', 5);
select seed_feature('starter', 'team_goals', 'Team Goals', true, 'Advanced', 6);
select seed_feature('starter', 'advanced_automations', 'Advanced Automations', false, 'Advanced', 7);
select seed_feature('starter', 'module_sportify', 'Sportify Events', false, 'Modules', 8);
select seed_feature('starter', 'module_valora', 'VALORA Valuations', false, 'Modules', 9);
select seed_feature('starter', 'module_businessnow', 'Business Now', false, 'Modules', 10);

-- Seed features — Pro
select seed_feature('pro', 'ai_insights', 'AI Deal Insights', true, 'AI Features', 1);
select seed_feature('pro', 'fulfillment_reports', 'Fulfillment Reports', true, 'Core CRM', 2);
select seed_feature('pro', 'custom_dashboard', 'Custom Dashboards', true, 'Advanced', 3);
select seed_feature('pro', 'bulk_import', 'Bulk Import', true, 'Core CRM', 4);
select seed_feature('pro', 'csv_export', 'CSV Export', true, 'Core CRM', 5);
select seed_feature('pro', 'team_goals', 'Team Goals', true, 'Advanced', 6);
select seed_feature('pro', 'advanced_automations', 'Advanced Automations', true, 'Advanced', 7);
select seed_feature('pro', 'module_sportify', 'Sportify Events', true, 'Modules', 8);
select seed_feature('pro', 'module_valora', 'VALORA Valuations', true, 'Modules', 9);
select seed_feature('pro', 'module_businessnow', 'Business Now', true, 'Modules', 10);

-- Seed features — Enterprise
select seed_feature('enterprise', 'ai_insights', 'AI Deal Insights', true, 'AI Features', 1);
select seed_feature('enterprise', 'fulfillment_reports', 'Fulfillment Reports', true, 'Core CRM', 2);
select seed_feature('enterprise', 'custom_dashboard', 'Custom Dashboards', true, 'Advanced', 3);
select seed_feature('enterprise', 'bulk_import', 'Bulk Import', true, 'Core CRM', 4);
select seed_feature('enterprise', 'csv_export', 'CSV Export', true, 'Core CRM', 5);
select seed_feature('enterprise', 'team_goals', 'Team Goals', true, 'Advanced', 6);
select seed_feature('enterprise', 'advanced_automations', 'Advanced Automations', true, 'Advanced', 7);
select seed_feature('enterprise', 'module_sportify', 'Sportify Events', true, 'Modules', 8);
select seed_feature('enterprise', 'module_valora', 'VALORA Valuations', true, 'Modules', 9);
select seed_feature('enterprise', 'module_businessnow', 'Business Now', true, 'Modules', 10);
select seed_feature('enterprise', 'white_label', 'White Label', true, 'Advanced', 11);
select seed_feature('enterprise', 'priority_support', 'Priority Support', true, 'Support', 12);
select seed_feature('enterprise', 'api_access', 'API Access', true, 'Advanced', 13);

-- Drop the helpers — they were only needed for seeding
drop function seed_limit(text, text, text, integer, text, integer, text);
drop function seed_feature(text, text, text, boolean, text, integer);

-- AI Credit Packs
insert into ai_credit_packs (pack_key, display_name, credit_amount, monthly_price_cents, one_time_price_cents, description, best_for_text, display_order)
values
  ('credits_100', '100 AI Credits', 100, 1900, 2400, 'Top up when you need more AI power', '~20 contract uploads or 50 deal insight runs', 1),
  ('credits_500', '500 AI Credits', 500, 7900, 9900, 'Most popular top-up for active teams', '~100 contract uploads or 250 deal insight runs', 2),
  ('credits_1000', '1,000 AI Credits', 1000, 13900, 16900, 'Heavy users processing contracts daily', '~200 contract uploads or 500 deal insight runs', 3)
on conflict (pack_key) do nothing;

-- AI Credit Costs
insert into ai_credit_costs (feature_key, feature_display_name, credits_per_use, description)
values
  ('contract_upload', 'Contract Parser', 5, 'PDF → structured benefits via Claude Opus'),
  ('deal_insight', 'Deal Insight', 2, 'AI analysis of a single deal'),
  ('prospect_search', 'Prospect Search', 3, 'AI-powered prospect discovery'),
  ('email_draft', 'Email Draft', 1, 'AI drafts a sponsorship outreach email'),
  ('contact_lookup', 'Contact Lookup', 2, 'Enrich a contact with firmographic data'),
  ('valora_analysis', 'VALORA Analysis', 8, 'Media valuation with AI market comps'),
  ('smart_reply_suggestion', 'Smart Reply', 1, 'Suggested replies in Conversations'),
  ('newsletter_generate', 'Newsletter Generate', 10, 'AI-generated newsletter draft'),
  ('forecast_run', 'Pipeline Forecast', 2, 'AI pipeline forecast run'),
  ('prospect_suggest', 'Prospect Suggestions', 3, 'AI suggests next-best prospects')
on conflict (feature_key) do nothing;

-- Addons
insert into addons (addon_key, display_name, description, long_description, monthly_price_cents, icon, available_for_plans, features_unlocked, limits_increased, display_order)
values
  ('valora_premium', 'VALORA Premium', 'Full AI media valuation, broadcast analysis, CPP modeling',
   'Unlocks the complete VALORA valuation engine for Starter plans — broadcast analysis, CPP modeling, market-comp pricing, and AI-powered negotiation insights. Comes standard on Pro and Enterprise.',
   4900, '📊', array['starter'], array['module_valora'], '{}'::jsonb, 1),

  ('advanced_analytics', 'Advanced Analytics', 'Custom dashboards, cross-deal reporting, trend analysis',
   'Custom dashboard builder, cross-deal rollups, trend analysis, cohort reporting, and executive summary exports.',
   2900, '📈', array['starter','pro'], array['custom_dashboard'], '{}'::jsonb, 2),

  ('white_label', 'White Label', 'Your branding on the platform for agency clients',
   'Replace Loud Legacy branding with your own. Custom domain, custom logo, custom accent colors, white-labeled client portals.',
   9900, '🏷️', array['pro'], array['white_label'], '{}'::jsonb, 3),

  ('api_access', 'API Access', 'Direct API for custom integrations and automations',
   'Full REST API access for custom integrations, Zapier, and automation pipelines. Includes API keys, rate limits, and developer docs.',
   4900, '🔌', array['starter','pro'], array['api_access'], '{}'::jsonb, 4),

  ('extra_users_5', '5 Extra Users', 'Add 5 more team members beyond your plan limit',
   'Add 5 additional team seats to your current plan without upgrading.',
   2900, '👥', array['starter','pro'], '{}', '{"users": 5}'::jsonb, 5),

  ('extra_users_10', '10 Extra Users', 'Add 10 more team members beyond your plan limit',
   'Add 10 additional team seats to your current plan without upgrading.',
   4900, '👥', array['starter','pro'], '{}', '{"users": 10}'::jsonb, 6),

  ('additional_property', 'Additional Property', 'Manage an additional sports org or venue on one account',
   'Add a completely separate property (second team, second venue, second agency client) to your Pro account.',
   3900, '🏢', array['pro'], '{}', '{"properties": 1}'::jsonb, 7)
on conflict (addon_key) do nothing;

-- Pricing page config
insert into pricing_page_config (config_key, config_value, config_type, description, category, display_order)
values
  ('hero_headline', 'Simple, Transparent Pricing', 'text', 'Main H1', 'hero', 1),
  ('hero_subheadline', 'The sponsorship CRM your competitors pay $15,000 a year for. Starting at $39 a month.', 'text', 'Subtitle under H1', 'hero', 2),
  ('comparison_callout', 'Legacy enterprise sponsorship CRMs charge $15,000+/year. Loud Legacy Pro is $199/month. Same category. 18 AI features they don''t have. 1/10th the price.', 'text', 'Callout box text', 'hero', 3),
  ('annual_billing_banner', 'Save 2 months with annual billing', 'text', 'Banner above toggle', 'hero', 4),
  ('comparison_callout_enabled', 'true', 'boolean', 'Show comparison callout box', 'sections', 1),
  ('faq_enabled', 'true', 'boolean', 'Show FAQ section', 'sections', 2),
  ('comparison_table_enabled', 'true', 'boolean', 'Show feature comparison table', 'sections', 3),
  ('addon_section_enabled', 'true', 'boolean', 'Show addons showcase', 'sections', 4),
  ('credit_section_enabled', 'true', 'boolean', 'Show AI credits explainer', 'sections', 5),
  ('testimonial_section_enabled', 'false', 'boolean', 'Show testimonials', 'sections', 6),
  ('enterprise_cta_enabled', 'true', 'boolean', 'Show enterprise CTA section', 'sections', 7),
  ('enterprise_cta_text', 'Talk to us about Enterprise', 'text', 'Enterprise button text', 'content', 1),
  ('enterprise_cta_subtext', 'Custom pricing for large organizations, agencies, and multi-property groups. White label and API access included.', 'text', 'Enterprise description', 'content', 2)
on conflict (config_key) do nothing;

-- FAQs
insert into pricing_page_faqs (question, answer, display_order)
values
  ('Why is Loud Legacy so much cheaper than legacy sponsorship CRMs?',
   'Legacy sponsorship CRMs were built for an era before AI automation made it possible to dramatically reduce the cost of sophisticated software. We built Loud Legacy from the ground up with AI at the core, which means we can deliver more features at a fraction of the cost.',
   1),
  ('What are AI credits?',
   'AI credits power the AI features in Loud Legacy — contract parsing, deal insights, prospect discovery, email drafting, and more. Every plan includes monthly credits. Heavy users can purchase additional credit packs that never expire.',
   2),
  ('Can I change plans anytime?',
   'Yes. Upgrade instantly. Downgrade at the end of your billing period. No lock-in contracts.',
   3),
  ('What happens to my data if I cancel?',
   'Your data is yours. We provide a full CSV export of all your deals, contacts, contracts, and assets before cancellation. We retain your data for 30 days after cancellation in case you change your mind.',
   4),
  ('Do you offer annual billing?',
   'Yes — and it saves you the equivalent of 2 months. Starter annual is $390/year ($32.50/month). Pro annual is $1,990/year ($165.83/month).',
   5),
  ('What is the Enterprise plan?',
   'Enterprise includes unlimited everything, white label, API access, dedicated support, and custom integrations. Pricing is based on organization size and needs. Contact us to discuss.',
   6)
on conflict do nothing;

-- Backfill organization_ai_credits for every existing property
insert into organization_ai_credits (property_id, plan_credits_remaining, period_start, period_end)
select p.id, 100, now(), now() + interval '1 month'
from properties p
on conflict (property_id) do nothing;

-- Backfill organization_billing from existing profiles (best-effort)
-- Uses profile.role → plan mapping where possible, otherwise defaults to free
insert into organization_billing (property_id, billing_period, plan_key, monthly_base_price_cents, annual_base_price_cents)
select
  p.id,
  'monthly',
  'free',
  0,
  0
from properties p
on conflict (property_id) do nothing;

-- ============================================================
-- DONE
-- ============================================================


-- ============================================================
-- ▼ ▼ ▼  056_bulk_contract_migration.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 056 — BULK CONTRACT MIGRATION SYSTEM
-- ============================================================
-- Adds four tables for tracking multi-contract upload sessions,
-- individual file processing state, extracted benefits (pre-review),
-- and sponsor duplicate resolution.
--
-- All writes flow into existing contacts / deals / contracts /
-- assets / fulfillment_records tables during finalization.
-- ============================================================

-- ========================
-- 1. MIGRATION SESSIONS
-- ========================
create table if not exists contract_migration_sessions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'uploading',
    -- 'uploading' | 'processing' | 'review' | 'complete' | 'failed'
  total_contracts integer not null default 0,
  contracts_processed integer not null default 0,
  contracts_complete integer not null default 0,
  contracts_failed integer not null default 0,
  total_benefits_extracted integer not null default 0,
  benefits_auto_matched integer not null default 0,
  benefits_needs_review integer not null default 0,
  benefits_approved integer not null default 0,
  sponsors_created integer not null default 0,
  deals_created integer not null default 0,
  fulfillment_records_created integer not null default 0,
  duplicate_sponsors_merged integer not null default 0,
  duplicate_assets_prevented integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_migration_sessions_property on contract_migration_sessions(property_id);
create index if not exists idx_migration_sessions_status on contract_migration_sessions(status);

alter table contract_migration_sessions enable row level security;

create policy "migration_sessions_select" on contract_migration_sessions
  for select using (is_developer() or property_id = get_user_property_id());
create policy "migration_sessions_insert" on contract_migration_sessions
  for insert with check (property_id = get_user_property_id());
create policy "migration_sessions_update" on contract_migration_sessions
  for update using (is_developer() or property_id = get_user_property_id());
create policy "migration_sessions_delete" on contract_migration_sessions
  for delete using (is_developer() or property_id = get_user_property_id());

-- ========================
-- 2. MIGRATION FILES
-- ========================
create table if not exists contract_migration_files (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references contract_migration_sessions(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  original_filename text not null,
  storage_path text,       -- path in supabase storage bucket
  file_url text,           -- public or signed URL
  file_type text,          -- 'pdf' | 'docx'
  file_size_bytes integer,
  status text not null default 'queued',
    -- 'queued' | 'uploading' | 'processing' | 'complete' | 'failed' | 'retrying'
  retry_count integer not null default 0,
  error_message text,
  extracted_data jsonb,    -- raw AI response (subject, dates, sponsor, benefits[])
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_migration_files_session on contract_migration_files(session_id);
create index if not exists idx_migration_files_status on contract_migration_files(status);

alter table contract_migration_files enable row level security;

create policy "migration_files_all" on contract_migration_files
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 3. MIGRATION BENEFITS (pre-review)
-- ========================
create table if not exists contract_migration_benefits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references contract_migration_sessions(id) on delete cascade,
  file_id uuid not null references contract_migration_files(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  benefit_name text not null,
  benefit_category text,
  frequency text,
  quantity integer default 1,
  unit_value numeric,
  annual_value numeric,
  total_value numeric,
  extracted_confidence numeric default 0,  -- 0-100
  review_status text not null default 'pending',
    -- 'pending' | 'approved' | 'edited' | 'rejected'
  asset_match_id uuid references assets(id) on delete set null,
  asset_match_confidence numeric default 0,
  asset_match_status text,
    -- 'auto_matched' | 'manually_matched' | 'new_asset' | 'rejected'
  final_benefit_name text,
  final_category text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_migration_benefits_session on contract_migration_benefits(session_id);
create index if not exists idx_migration_benefits_file on contract_migration_benefits(file_id);
create index if not exists idx_migration_benefits_review on contract_migration_benefits(review_status);

alter table contract_migration_benefits enable row level security;

create policy "migration_benefits_all" on contract_migration_benefits
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ========================
-- 4. MIGRATION SPONSORS (duplicate resolution)
-- ========================
create table if not exists contract_migration_sponsors (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references contract_migration_sessions(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  extracted_name text,
  extracted_email text,
  extracted_phone text,
  extracted_company text,
  extracted_contact_person text,
  contract_file_ids uuid[] default '{}',
  duplicate_of_contact_id uuid references contacts(id) on delete set null,
  merge_status text not null default 'new',
    -- 'new' | 'merged' | 'conflict'
  conflict_fields jsonb,
  final_contact_id uuid references contacts(id) on delete set null,
  review_status text not null default 'pending',
    -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz not null default now()
);

create index if not exists idx_migration_sponsors_session on contract_migration_sponsors(session_id);

alter table contract_migration_sponsors enable row level security;

create policy "migration_sponsors_all" on contract_migration_sponsors
  for all using (is_developer() or property_id = get_user_property_id())
  with check (is_developer() or property_id = get_user_property_id());

-- ============================================================
-- DONE
-- ============================================================


-- ============================================================
-- ▼ ▼ ▼  057_remove_competitor_references.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 057 — REMOVE COMPETITOR REFERENCES FROM PRICING PAGE
-- ============================================================
-- Replaces direct competitor name references in the pricing page
-- comparison callout and FAQ with category-neutral language. Idempotent
-- — safe to run after migration 055 even if these strings have been
-- edited via the developer pricing control center.
--
-- Only updates rows where the value still matches the original
-- competitor-named seed text, so manual edits in /dev/pricing/page
-- are preserved.
-- ============================================================

-- Update the comparison callout
update pricing_page_config
set
  config_value = 'Legacy enterprise sponsorship CRMs charge $15,000+/year. Loud Legacy Pro is $199/month. Same category. 18 AI features they don''t have. 1/10th the price.',
  updated_at = now()
where config_key = 'comparison_callout'
  and config_value = 'SponsorCX charges $15,000/year. Loud Legacy Pro is $199/month. Same category. 18 AI features they don''t have. 1/10th the price.';

-- Update the "Why is Loud Legacy so much cheaper" FAQ
update pricing_page_faqs
set
  question = 'Why is Loud Legacy so much cheaper than legacy sponsorship CRMs?',
  answer = 'Legacy sponsorship CRMs were built for an era before AI automation made it possible to dramatically reduce the cost of sophisticated software. We built Loud Legacy from the ground up with AI at the core, which means we can deliver more features at a fraction of the cost.',
  updated_at = now()
where question = 'Why is Loud Legacy so much cheaper than SponsorCX?';

-- ============================================================
-- DONE
-- ============================================================


-- ============================================================
-- ▼ ▼ ▼  058_fix_feature_flag_writes.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 058 — FIX FEATURE FLAG WRITES
-- ============================================================
-- Three bugs that together made feature flag toggles appear to
-- save but silently revert on reload:
--
-- 1. feature_flags.module had a CHECK constraint locking it to
--    exactly 15 string values (from migration 045). Any newer
--    flag (client_growth_hub, outlook_integration, show_*, etc.)
--    failed the check on insert. Adding a new feature flag
--    should NOT require a database migration — this migration
--    drops the CHECK constraint entirely.
--
-- 2. feature_flags had no INSERT or DELETE RLS policy (only
--    select + update from migration 002). Even when the CHECK
--    passed, inserts were silently blocked by RLS, so the
--    frontend's INSERT-on-update-miss fallback would fail.
--
-- 3. A companion fix in useFeatureFlags.jsx loadFlags() is
--    applied in the same commit — it was forcing the developer
--    baseline ALL_ON on every reload and ignoring DB values for
--    non-hidden flags. So even after the DB writes worked,
--    developers would still see toggles revert on reload.
--
-- After this migration + the JS fix, developers can toggle any
-- flag in Dev Tools / Business Ops and it persists correctly.
-- ============================================================

-- ─── Drop the CHECK constraint entirely ─────────────────────
-- New flags should not require a DB migration to work.
alter table feature_flags drop constraint if exists feature_flags_module_check;

-- ─── Add missing INSERT + DELETE policies ───────────────────
-- Developer-only. Matches the existing flags_update policy.
drop policy if exists flags_insert on feature_flags;
create policy "flags_insert" on feature_flags
  for insert with check (is_developer());

drop policy if exists flags_delete on feature_flags;
create policy "flags_delete" on feature_flags
  for delete using (is_developer());

-- ─── Backfill every known module as a row ──────────────────
-- Every flag the app references today gets an explicit row.
-- 'show_*' industry visibility and 'crm' default to ON to match
-- the hardcoded DEFAULT_FLAGS fallback in useFeatureFlags.jsx.
-- Everything else defaults to OFF — the developer role still
-- sees a baseline-ON experience via the ALL_ON override in the
-- hook, but clients see the correct DB-backed state.
-- on conflict (module) do nothing means existing rows are
-- preserved (nothing stomps on values already in place).
insert into feature_flags (module, enabled, updated_at) values
  -- Core modules
  ('crm', true, now()),
  ('sportify', false, now()),
  ('valora', false, now()),
  ('businessnow', false, now()),
  ('newsletter', false, now()),
  ('automations', false, now()),
  ('businessops', false, now()),
  ('developer', false, now()),
  ('marketing', false, now()),
  -- Industry availability
  ('industry_nonprofit', false, now()),
  ('industry_media', false, now()),
  ('industry_realestate', false, now()),
  ('industry_entertainment', false, now()),
  ('industry_conference', false, now()),
  ('industry_agency', false, now()),
  -- Industry visibility (signup + welcome — default ON)
  ('show_sports', true, now()),
  ('show_entertainment', true, now()),
  ('show_conference', true, now()),
  ('show_nonprofit', true, now()),
  ('show_media', true, now()),
  ('show_realestate', true, now()),
  ('show_agency', true, now()),
  ('show_other', true, now()),
  -- Client-facing Growth Tools (all default OFF — greenlit by developer)
  ('client_growth_hub', false, now()),
  ('client_marketing_hub', false, now()),
  ('client_ad_spend', false, now()),
  ('client_goal_tracker', false, now()),
  ('client_connection_manager', false, now()),
  ('client_financial_projections', false, now()),
  ('client_finance_dashboard', false, now()),
  ('client_growth_workbook', false, now()),
  ('client_report_builder', false, now()),
  ('client_strategic_workbooks', false, now()),
  -- Hidden flags
  ('outlook_integration', false, now()),
  ('email_marketing_developer', false, now()),
  ('email_marketing_public', false, now())
on conflict (module) do nothing;

-- ============================================================
-- DONE
-- ============================================================


-- ============================================================
-- ▼ ▼ ▼  059_qa_walkthrough_comments.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 059 — QA WALKTHROUGH COMMENTS
-- ============================================================
-- A lightweight ad-hoc comment capture system for walking
-- through the site during QA. Separate from the structured
-- qa_test_cases workflow — this is for "leave me a note about
-- this page" style feedback.
--
-- Usage:
--   Developer clicks the floating QA button on any page, types
--   a comment, picks a category, submits. Row is inserted with
--   the current URL and page context pre-filled. All comments
--   are visible in a single report at /app/developer → QA
--   Comments tab.
-- ============================================================

create table if not exists qa_comments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  property_id uuid references properties(id) on delete set null,

  -- Content
  comment text not null,
  category text not null default 'note',
    -- 'bug' | 'suggestion' | 'polish' | 'question' | 'note'
  priority text not null default 'normal',
    -- 'low' | 'normal' | 'high' | 'blocker'

  -- Page context — auto-captured on submit
  page_url text,                   -- full URL at time of comment
  page_title text,                 -- document.title
  module text,                     -- inferred module (crm, sportify, etc.)
  viewport_width integer,
  viewport_height integer,
  user_agent text,

  -- Lifecycle
  status text not null default 'open',
    -- 'open' | 'resolved' | 'wontfix' | 'dismissed'
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,

  -- Optional screenshot (base64 or storage URL — we keep it simple)
  screenshot_url text,

  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_qa_comments_created on qa_comments(created_at desc);
create index if not exists idx_qa_comments_status on qa_comments(status);
create index if not exists idx_qa_comments_category on qa_comments(category);
create index if not exists idx_qa_comments_module on qa_comments(module);

-- ─── RLS ─────────────────────────────────────────────────────
alter table qa_comments enable row level security;

-- Any authenticated user can INSERT a comment (capture during QA).
-- Viewing the consolidated report is developer-only below.
create policy "qa_comments_insert" on qa_comments
  for insert with check (auth.uid() is not null);

-- Developer reads everything. Non-developers can read their own
-- comments (so a user walking the site can see what they've
-- submitted during the session).
create policy "qa_comments_select" on qa_comments
  for select using (
    is_developer() or created_by = auth.uid()
  );

-- Only developer can update / delete (resolve, dismiss, etc.)
create policy "qa_comments_update" on qa_comments
  for update using (is_developer());

create policy "qa_comments_delete" on qa_comments
  for delete using (is_developer());

-- ============================================================
-- DONE
-- ============================================================


-- ============================================================
-- ▼ ▼ ▼  060_qa_repair_prompts.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 060 — QA REPAIR PROMPTS ARCHIVE
-- ============================================================
-- Stores Claude Code-ready repair prompts auto-generated by the
-- AutoQA engine. When the engine runs a full site pass and
-- detects patterns (e.g. "17 probes hit RLS errors", "8 routes
-- crashed on render"), it generates a copy-paste prompt and
-- archives it here for future reference.
--
-- Separate from qa_comments (ad-hoc walkthrough notes) and
-- qa_test_cases (structured test cases). This table holds
-- AUTO-GENERATED repair instructions tied to a specific QA run.
-- ============================================================

create table if not exists qa_repair_prompts (
  id uuid primary key default gen_random_uuid(),

  -- Link back to the run that generated this prompt (optional —
  -- prompts can also be created manually)
  qa_report_id uuid references qa_auto_reports(id) on delete set null,

  title text not null,
  summary text,
  pattern_detected text not null,
    -- 'rls_write_failures' | 'check_constraint_failures'
    -- | 'missing_columns' | 'route_render_errors'
    -- | 'integration_broken' | 'flaky_tests'
    -- | 'slow_queries' | 'api_errors' | 'custom'

  severity text not null default 'medium',
    -- 'low' | 'medium' | 'high' | 'critical'

  -- The full Claude Code prompt, paste-ready
  prompt_text text not null,

  -- Raw evidence from the QA run that triggered this prompt —
  -- list of failed probes, error codes, affected tables/routes.
  evidence jsonb default '{}'::jsonb,

  -- Lifecycle
  status text not null default 'new',
    -- 'new' | 'copied' | 'applied' | 'archived' | 'dismissed'
  copied_at timestamptz,
  applied_at timestamptz,
  notes text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_qa_repair_prompts_status on qa_repair_prompts(status);
create index if not exists idx_qa_repair_prompts_created on qa_repair_prompts(created_at desc);
create index if not exists idx_qa_repair_prompts_pattern on qa_repair_prompts(pattern_detected);
create index if not exists idx_qa_repair_prompts_report on qa_repair_prompts(qa_report_id);

alter table qa_repair_prompts enable row level security;

-- Developer-only. This is internal QA infrastructure.
create policy "qa_repair_prompts_all" on qa_repair_prompts
  for all using (is_developer()) with check (is_developer());

-- ============================================================
-- DONE
-- ============================================================


-- ============================================================
-- ▼ ▼ ▼  061_storage_buckets.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 061 — STORAGE BUCKETS
-- ============================================================
-- Creates the storage buckets the app references but that weren't
-- being created in any migration. The AutoQA engine's upload probe
-- caught this — the 'media' bucket used by MarketingHub wasn't
-- actually created by any migration, it was expected to exist.
--
-- Creates both:
--   - 'media' — used by MarketingHub, AutoQA upload probe, and
--     the QA comments screenshot feature (when wired)
--   - 'contract-migrations' — used by the bulk contract migration
--     system (contractMigrationService.js)
--
-- Policies are created via DO blocks so a failure to create one
-- policy (e.g. already exists in some other form) doesn't block
-- the whole migration.
-- ============================================================

-- ─── Create buckets ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('media', 'media', false),
  ('contract-migrations', 'contract-migrations', false)
on conflict (id) do nothing;

-- ─── Policies for 'media' bucket ────────────────────────────
-- Any authenticated user can upload/read their own files in media.
-- Developer can read/delete anything.
do $$
begin
  -- Drop any existing policies so this is idempotent
  drop policy if exists "media_upload" on storage.objects;
  drop policy if exists "media_read" on storage.objects;
  drop policy if exists "media_update" on storage.objects;
  drop policy if exists "media_delete" on storage.objects;

  create policy "media_upload" on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'media');

  create policy "media_read" on storage.objects
    for select
    using (bucket_id = 'media');

  create policy "media_update" on storage.objects
    for update
    to authenticated
    using (bucket_id = 'media')
    with check (bucket_id = 'media');

  create policy "media_delete" on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'media');
exception when others then
  raise notice 'media bucket policies: %', sqlerrm;
end $$;

-- ─── Policies for 'contract-migrations' bucket ──────────────
-- Path structure: {property_id}/{session_id}/{timestamp}_{filename}
-- Only authenticated users can upload. Developer can read/delete all.
do $$
begin
  drop policy if exists "contract_migrations_upload" on storage.objects;
  drop policy if exists "contract_migrations_read" on storage.objects;
  drop policy if exists "contract_migrations_delete" on storage.objects;

  create policy "contract_migrations_upload" on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'contract-migrations');

  create policy "contract_migrations_read" on storage.objects
    for select
    to authenticated
    using (bucket_id = 'contract-migrations');

  create policy "contract_migrations_delete" on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'contract-migrations');
exception when others then
  raise notice 'contract-migrations bucket policies: %', sqlerrm;
end $$;

-- ============================================================
-- DONE
-- ============================================================


-- ============================================================
-- ▼ ▼ ▼  062_digest_management_system.sql  ▼ ▼ ▼
-- ============================================================

-- ============================================================
-- MIGRATION 062 — DIGEST MANAGEMENT SYSTEM
-- ============================================================
-- "The Digest by Loud Legacy Ventures" — monthly editorial
-- newsletter/article living at loud-legacy.com/digest.
--
-- Deliberately does NOT create a new subscribers table — the
-- existing email_subscribers table from migration 054 already
-- has email, first/last name, industry, status, unsubscribe_token,
-- and tags. Digest subscribers are just email_subscribers rows
-- with 'digest' in their tags array.
--
-- Deliberately does NOT create a new campaigns table — on publish,
-- a row is written to email_campaigns (from migration 054) with
-- the article rendered into the branded HTML email template, and
-- the existing email-marketing-send edge function delivers it.
--
-- What this migration ADDS:
--   - digest_issues:           editorial content (title, body md, status)
--   - digest_issue_images:     image library scoped to issues
--   - digest_signup_events:    audit log of signups from landing page
-- ============================================================

-- Drop the CHECK constraint one more time in case the DB is still
-- stuck on the migration 045 version. Idempotent. See migration
-- 058 for the permanent fix.
alter table feature_flags drop constraint if exists feature_flags_module_check;

-- ========================
-- 1. DIGEST ISSUES
-- ========================
create table if not exists digest_issues (
  id uuid primary key default gen_random_uuid(),

  -- Core content
  slug text not null unique,       -- URL-safe: e.g. "february-2026-real-estate-trends"
  title text not null,
  subtitle text,
  author text default 'Loud Legacy Ventures',

  -- Body — stored as Markdown, rendered to HTML at display time
  body_markdown text not null default '',

  -- Featured image
  featured_image_url text,
  featured_image_alt text,

  -- Taxonomy
  industry text,                   -- 'real_estate' | 'sports' | 'marketing' | 'general' | null
  tags text[] default '{}',

  -- Publish lifecycle
  status text not null default 'draft',
    -- 'draft' | 'scheduled' | 'published' | 'archived'
  published_at timestamptz,
  scheduled_for timestamptz,       -- if status='scheduled'

  -- SEO
  meta_title text,                 -- falls back to title
  meta_description text,           -- falls back to subtitle + first 150 chars
  canonical_url text,

  -- Metrics (denormalized from email_campaigns + digest_article_views)
  view_count integer not null default 0,
  email_sends integer not null default 0,
  email_opens integer not null default 0,
  email_clicks integer not null default 0,

  -- Email dispatch link
  email_campaign_id uuid,          -- FK to email_campaigns (nullable before publish)
  send_email_on_publish boolean default true,
  email_sent_at timestamptz,

  -- AI research provenance (when an issue was generated by digest-research)
  ai_researched boolean default false,
  ai_research_prompt text,
  ai_research_citations jsonb default '[]'::jsonb,

  -- Audit
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_digest_issues_status on digest_issues(status);
create index if not exists idx_digest_issues_published on digest_issues(published_at desc) where status = 'published';
create index if not exists idx_digest_issues_scheduled on digest_issues(scheduled_for) where status = 'scheduled';
create index if not exists idx_digest_issues_industry on digest_issues(industry);
create index if not exists idx_digest_issues_slug on digest_issues(slug);

alter table digest_issues enable row level security;

-- Public READ for published issues only — powers the /digest archive
create policy "digest_issues_public_read" on digest_issues
  for select using (status = 'published');

-- Developer WRITES (and also reads drafts) — authoring flow
create policy "digest_issues_developer_write" on digest_issues
  for all using (is_developer())
  with check (is_developer());

-- ========================
-- 2. DIGEST ISSUE IMAGES (image library)
-- ========================
-- Every image uploaded via the editor is tracked here so it can
-- be reused across issues. Storage itself lives in the 'media'
-- bucket (migration 061); this table stores the URL + metadata.
create table if not exists digest_issue_images (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references digest_issues(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,

  storage_path text not null,      -- path in media bucket
  public_url text not null,
  original_filename text,
  file_size_bytes integer,
  width integer,
  height integer,

  alt_text text,
  caption text,
  position text default 'inline',  -- 'inline' | 'full_width' | 'featured'

  is_reusable boolean default true, -- if true, appears in the image library picker
  created_at timestamptz not null default now()
);

create index if not exists idx_digest_issue_images_issue on digest_issue_images(issue_id);
create index if not exists idx_digest_issue_images_reusable on digest_issue_images(is_reusable, created_at desc);

alter table digest_issue_images enable row level security;

create policy "digest_images_public_read" on digest_issue_images for select using (true);
create policy "digest_images_developer_write" on digest_issue_images
  for all using (is_developer()) with check (is_developer());

-- ========================
-- 3. DIGEST SIGNUP EVENTS (audit log for landing-page signups)
-- ========================
-- When someone submits the Digest signup form on the landing page,
-- two things happen: (1) an email_subscribers row is created
-- with 'digest' tag, (2) a row lands here for audit/analytics.
-- Keeping this separate from email_subscriber_events so Digest
-- analytics can be queried without cluttering the subscriber
-- events stream.
create table if not exists digest_signup_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references email_subscribers(id) on delete set null,
  email text not null,
  first_name text,
  industry_interest text,
  source text default 'landing_page',  -- 'landing_page' | 'article_footer' | 'archive_page'
  user_agent text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists idx_digest_signup_events_created on digest_signup_events(created_at desc);
create index if not exists idx_digest_signup_events_email on digest_signup_events(lower(email));

alter table digest_signup_events enable row level security;

-- Public can INSERT (landing page signup is unauthenticated)
create policy "digest_signups_public_insert" on digest_signup_events
  for insert with check (true);

-- Developer reads
create policy "digest_signups_developer_read" on digest_signup_events
  for select using (is_developer());

-- ========================
-- 4. DIGEST ARTICLE VIEWS (simple view counter)
-- ========================
-- Lightweight view logging so we can show read counts in the
-- admin panel. Does NOT store PII — just timestamps + issue_id.
create table if not exists digest_article_views (
  id bigserial primary key,
  issue_id uuid not null references digest_issues(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  referrer text,
  utm_source text
);

create index if not exists idx_digest_views_issue on digest_article_views(issue_id, viewed_at desc);

alter table digest_article_views enable row level security;

-- Public INSERT (view tracking is unauthenticated)
create policy "digest_views_public_insert" on digest_article_views
  for insert with check (true);

create policy "digest_views_developer_read" on digest_article_views
  for select using (is_developer());

-- ========================
-- 5. FEATURE FLAG (hidden, developer-only gate)
-- ========================
insert into feature_flags (module, enabled, updated_at)
values ('digest_system', true, now())
on conflict (module) do nothing;

-- ============================================================
-- DONE
-- ============================================================


-- ============================================================
-- ▼ ▼ ▼  FINAL: reload PostgREST schema cache  ▼ ▼ ▼
-- ============================================================
-- After applying migrations, PostgREST's schema cache is stale
-- and new tables return "not found in schema cache". This tells
-- PostgREST to refresh immediately.

notify pgrst, 'reload schema';

-- ============================================================
-- DONE — verify by running:
--   select tablename from pg_tables where schemaname='public'
--     and tablename in (
--       'automation_settings', 'outlook_auth', 'email_campaigns',
--       'pricing_plans', 'contract_migration_sessions',
--       'qa_comments', 'qa_repair_prompts', 'digest_issues'
--     );
-- You should see all 8 rows.
-- ============================================================

-- Automation rules engine
CREATE TABLE IF NOT EXISTS automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'deal_stage_change', 'deal_created', 'deal_stale', 'contract_signed',
    'fulfillment_overdue', 'prospect_added', 'trial_expiring',
    'contact_added', 'task_overdue', 'deal_value_change'
  )),
  trigger_config jsonb DEFAULT '{}', -- e.g. { "from_stage": "Prospect", "to_stage": "Contracted" }
  action_type text NOT NULL CHECK (action_type IN (
    'send_notification', 'create_task', 'update_deal', 'send_email',
    'create_fulfillment', 'research_contacts', 'assign_user',
    'create_activity', 'webhook'
  )),
  action_config jsonb DEFAULT '{}', -- e.g. { "notify_role": "admin", "message": "..." }
  active boolean DEFAULT true,
  run_count integer DEFAULT 0,
  last_run_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_property ON automations(property_id, trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_active ON automations(active) WHERE active = true;

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automations_property" ON automations FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- Automation execution log
CREATE TABLE IF NOT EXISTS automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  trigger_data jsonb,
  action_result jsonb,
  success boolean DEFAULT true,
  error_message text,
  executed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_log_auto ON automation_log(automation_id, executed_at DESC);
ALTER TABLE automation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_log_property" ON automation_log FOR ALL USING (
  EXISTS (SELECT 1 FROM automations a WHERE a.id = automation_log.automation_id AND (
    a.property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
  ))
);

-- Webhook integrations (Zapier, Slack, custom)
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL, -- ['deal_stage_change', 'contract_signed', etc]
  headers jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  secret text, -- for signature verification
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhooks_property" ON webhooks FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

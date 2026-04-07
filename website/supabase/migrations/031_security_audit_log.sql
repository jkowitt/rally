-- Audit log — tracks who changed what across the platform
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'role_change', 'plan_change'
  entity_type text, -- 'deal', 'contract', 'profile', 'property', 'asset', etc
  entity_id uuid,
  entity_name text,
  changes jsonb, -- { field: { old: x, new: y } }
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Only developer can read audit logs
CREATE POLICY "audit_read_dev" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);
-- Anyone can insert (tracking their own actions)
CREATE POLICY "audit_insert_any" ON audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Login history table
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text,
  ip_address text,
  user_agent text,
  login_at timestamptz DEFAULT now(),
  success boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id, login_at DESC);
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_history_read_dev" ON login_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
  OR user_id = auth.uid()
);
CREATE POLICY "login_history_insert" ON login_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Tighten team_members RLS (was USING (true) for debugging)
DROP POLICY IF EXISTS "tm_select" ON team_members;
DROP POLICY IF EXISTS "tm_insert" ON team_members;
DROP POLICY IF EXISTS "tm_update" ON team_members;
DROP POLICY IF EXISTS "tm_delete" ON team_members;

CREATE POLICY "tm_select" ON team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
  OR user_id = auth.uid()
  OR team_id IN (SELECT id FROM teams WHERE property_id = (SELECT property_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "tm_insert" ON team_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
  OR team_id IN (SELECT id FROM teams WHERE property_id = (SELECT property_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "tm_update" ON team_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
  OR team_id IN (SELECT id FROM teams WHERE property_id = (SELECT property_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY "tm_delete" ON team_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
  OR team_id IN (SELECT id FROM teams WHERE property_id = (SELECT property_id FROM profiles WHERE id = auth.uid()))
);

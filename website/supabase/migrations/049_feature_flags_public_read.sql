-- Allow anonymous users to read feature_flags so the landing page + signup can filter industries
DROP POLICY IF EXISTS feature_flags_public_read ON feature_flags;
CREATE POLICY feature_flags_public_read ON feature_flags FOR SELECT USING (true);
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

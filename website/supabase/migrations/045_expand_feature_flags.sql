-- Expand feature flags to cover all modules
-- Add new modules that were built but not in the flags table
INSERT INTO feature_flags (module, enabled) VALUES
  ('newsletter', true),
  ('automations', true),
  ('businessops', true),
  ('developer', true),
  ('marketing', true),
  ('industry_nonprofit', true),
  ('industry_media', true),
  ('industry_realestate', true),
  ('industry_entertainment', true),
  ('industry_conference', true),
  ('industry_agency', true)
ON CONFLICT (module) DO NOTHING;

-- Expand the check constraint to allow new modules
ALTER TABLE feature_flags DROP CONSTRAINT IF EXISTS feature_flags_module_check;
ALTER TABLE feature_flags ADD CONSTRAINT feature_flags_module_check
  CHECK (module IN ('crm','sportify','valora','businessnow','newsletter','automations','businessops','developer','marketing','industry_nonprofit','industry_media','industry_realestate','industry_entertainment','industry_conference','industry_agency'));

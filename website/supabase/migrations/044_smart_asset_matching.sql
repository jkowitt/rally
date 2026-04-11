-- Smart asset matching: learn from past matches to improve over time
CREATE TABLE IF NOT EXISTS asset_match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  benefit_text text NOT NULL, -- the raw benefit description from contract
  matched_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  matched_asset_name text,
  matched_category text,
  confidence numeric, -- 0.0 to 1.0
  was_auto boolean DEFAULT false, -- true if auto-matched, false if user-approved
  approved boolean DEFAULT true, -- was the match accepted?
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_match_property ON asset_match_history(property_id);
CREATE INDEX IF NOT EXISTS idx_asset_match_text ON asset_match_history(benefit_text);

-- Pending matches that need user approval
CREATE TABLE IF NOT EXISTS asset_match_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  benefit_id uuid REFERENCES contract_benefits(id) ON DELETE CASCADE,
  benefit_text text NOT NULL,
  suggested_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  suggested_asset_name text,
  suggested_category text,
  confidence numeric,
  alternative_assets jsonb DEFAULT '[]', -- [{asset_id, name, category, confidence}]
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'new_asset')) DEFAULT 'pending',
  resolved_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_queue_status ON asset_match_queue(status);
CREATE INDEX IF NOT EXISTS idx_match_queue_contract ON asset_match_queue(contract_id);

ALTER TABLE asset_match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_match_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_history_access" ON asset_match_history FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));
CREATE POLICY "match_queue_access" ON asset_match_queue FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops', 'admin')));

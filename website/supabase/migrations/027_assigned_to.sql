-- Add assigned_to field for deals and contracts
ALTER TABLE deals ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_assigned ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contracts_assigned ON contracts(assigned_to);

-- Overage pricing configuration (developer-managed)
CREATE TABLE IF NOT EXISTS overage_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text UNIQUE NOT NULL CHECK (service IN ('apollo', 'hunter', 'claude', 'prospect_search', 'contact_research', 'contract_upload', 'ai_valuation', 'newsletter_generate')),
  included_qty integer NOT NULL DEFAULT 0,
  overage_price_cents integer NOT NULL DEFAULT 0,
  label text,
  active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE overage_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overage_read_all" ON overage_pricing FOR SELECT USING (true);
CREATE POLICY "overage_manage_dev" ON overage_pricing FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- Seed defaults
INSERT INTO overage_pricing (service, included_qty, overage_price_cents, label) VALUES
  ('prospect_search', 50, 25, 'Prospect Search'),
  ('contact_research', 50, 50, 'Contact Research'),
  ('contract_upload', 25, 100, 'Contract Upload & Analysis'),
  ('ai_valuation', 25, 75, 'AI Valuation'),
  ('newsletter_generate', 10, 50, 'Newsletter Generation')
ON CONFLICT (service) DO NOTHING;

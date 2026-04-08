-- QA Tickets
CREATE TABLE IF NOT EXISTS qa_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  source text DEFAULT 'manual', -- 'auto_error', 'auto_new_module', 'manual', 'health_check'
  priority text CHECK (priority IN ('high', 'low')) DEFAULT NULL, -- NULL = medium (no label shown)
  status text CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix')) DEFAULT 'open',
  category text, -- 'error', 'new_module', 'new_page', 'regression', 'enhancement', 'bug'
  page_url text,
  error_message text,
  stack_trace text,
  assigned_to uuid REFERENCES profiles(id),
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE qa_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_tickets_ops" ON qa_tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);
CREATE INDEX IF NOT EXISTS idx_qa_tickets_status ON qa_tickets(status, priority);

-- Accounting records (every financial event across all accounts)
CREATE TABLE IF NOT EXISTS accounting_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  record_type text NOT NULL, -- 'subscription', 'overage', 'refund', 'credit', 'payment', 'invoice'
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  description text,
  period text, -- '2025-04'
  plan text, -- 'starter', 'pro', 'enterprise'
  stripe_invoice_id text,
  stripe_payment_id text,
  status text DEFAULT 'recorded', -- 'recorded', 'invoiced', 'paid', 'refunded', 'void'
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE accounting_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_ops" ON accounting_records FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);
CREATE INDEX IF NOT EXISTS idx_accounting_property ON accounting_records(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_period ON accounting_records(period);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  property_name text,
  billing_email text,
  period text NOT NULL,
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric DEFAULT 0,
  line_items jsonb, -- [{description, quantity, unit_price, amount}]
  status text DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'void'
  paid_at timestamptz,
  sent_at timestamptz,
  due_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_ops" ON invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops'))
);

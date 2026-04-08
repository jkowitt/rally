-- ============================================================
-- INDUSTRY-SPECIFIC MODULES — Tables for all new features
-- ============================================================

-- NONPROFIT: Impact metrics
CREATE TABLE IF NOT EXISTS impact_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  metric_name text NOT NULL,
  metric_value numeric DEFAULT 0,
  metric_unit text, -- 'lives', 'meals', 'scholarships', 'dollars', etc
  period text, -- 'Q1 2025', '2025', 'FY25'
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE impact_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "impact_metrics_access" ON impact_metrics FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- NONPROFIT: Grants
CREATE TABLE IF NOT EXISTS grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  funder text,
  amount numeric,
  status text CHECK (status IN ('researching','drafting','submitted','under_review','approved','declined','reporting')) DEFAULT 'researching',
  deadline date,
  submitted_date date,
  decision_date date,
  reporting_due date,
  requirements text,
  notes text,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grants_access" ON grants FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- MEDIA: Campaign calendar
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  name text NOT NULL,
  advertiser text,
  placement_type text,
  start_date date,
  end_date date,
  impressions_target integer,
  impressions_delivered integer DEFAULT 0,
  budget numeric,
  status text CHECK (status IN ('planned','live','paused','completed','cancelled')) DEFAULT 'planned',
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_campaigns_access" ON ad_campaigns FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- MEDIA: Audience metrics
CREATE TABLE IF NOT EXISTS audience_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  channel text, -- 'website', 'podcast', 'newsletter', 'social', 'broadcast'
  metric_name text NOT NULL, -- 'pageviews', 'listeners', 'subscribers', 'followers'
  metric_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audience_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audience_metrics_access" ON audience_metrics FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- REAL ESTATE: Property units
CREATE TABLE IF NOT EXISTS property_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_name text NOT NULL,
  unit_type text, -- 'office', 'retail', 'warehouse', 'flex', etc
  floor text,
  square_feet numeric,
  price_per_sqft numeric,
  status text CHECK (status IN ('available','under_negotiation','leased','under_renovation','unavailable')) DEFAULT 'available',
  tenant_name text,
  tenant_deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  lease_start date,
  lease_end date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE property_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_units_access" ON property_units FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- REAL ESTATE: Broker network
CREATE TABLE IF NOT EXISTS brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  commission_rate numeric, -- percentage
  deals_referred integer DEFAULT 0,
  total_commission numeric DEFAULT 0,
  status text CHECK (status IN ('active','inactive')) DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers_access" ON brokers FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- ENTERTAINMENT: Bookings
CREATE TABLE IF NOT EXISTS venue_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  artist_talent text,
  booking_date date,
  load_in time,
  doors_open time,
  show_time time,
  status text CHECK (status IN ('hold','confirmed','contracted','cancelled','completed')) DEFAULT 'hold',
  capacity integer,
  ticket_price numeric,
  guarantee numeric,
  door_split numeric, -- percentage
  agent_name text,
  agent_email text,
  agent_phone text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE venue_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_bookings_access" ON venue_bookings FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- AGENCY: Commission tracking
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  client_property_id uuid REFERENCES properties(id),
  deal_value numeric DEFAULT 0,
  commission_rate numeric DEFAULT 15, -- percentage
  commission_amount numeric DEFAULT 0,
  status text CHECK (status IN ('projected','earned','invoiced','paid')) DEFAULT 'projected',
  paid_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commissions_access" ON commissions FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

-- CONFERENCE: Attendee tracking
CREATE TABLE IF NOT EXISTS conference_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  registration_type text, -- 'general', 'vip', 'speaker', 'exhibitor', 'press'
  total_registered integer DEFAULT 0,
  total_attended integer DEFAULT 0,
  badge_scans_total integer DEFAULT 0,
  session_name text,
  notes text,
  tracked_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conference_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conference_attendees_access" ON conference_attendees FOR ALL USING (
  property_id IN (SELECT property_id FROM profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'developer')
);

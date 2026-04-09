-- QA Test Suite: test cases, test runs, and results

-- Predefined test cases for each module
CREATE TABLE IF NOT EXISTS qa_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  title text NOT NULL,
  description text,
  steps text,
  expected_result text,
  priority text CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  category text CHECK (category IN ('functional', 'ui', 'performance', 'security', 'mobile', 'integration')) DEFAULT 'functional',
  created_at timestamptz DEFAULT now()
);

-- A test run groups test executions together
CREATE TABLE IF NOT EXISTS qa_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planned',
  run_type text CHECK (run_type IN ('full', 'regression', 'smoke', 'module', 'custom')) DEFAULT 'full',
  target_module text, -- NULL for full runs, module name for targeted runs
  created_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Individual test results within a run
CREATE TABLE IF NOT EXISTS qa_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES qa_test_runs(id) ON DELETE CASCADE,
  test_case_id uuid REFERENCES qa_test_cases(id) ON DELETE CASCADE,
  status text CHECK (status IN ('not_started', 'passed', 'failed', 'blocked', 'skipped')) DEFAULT 'not_started',
  assigned_to uuid REFERENCES profiles(id),
  tested_by uuid REFERENCES profiles(id),
  tested_at timestamptz,
  notes text,
  ticket_id uuid REFERENCES qa_tickets(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_test_results_run ON qa_test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_results_status ON qa_test_results(status);
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_module ON qa_test_cases(module);

-- RLS
ALTER TABLE qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dev/bizops access test cases" ON qa_test_cases FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));
CREATE POLICY "Dev/bizops access test runs" ON qa_test_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));
CREATE POLICY "Dev/bizops access test results" ON qa_test_results FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('developer', 'businessops')));

-- Seed comprehensive test cases for every module
INSERT INTO qa_test_cases (module, title, steps, expected_result, priority, category) VALUES

-- PIPELINE
('pipeline', 'Create new deal', '1. Click "Add Deal"\n2. Fill brand name, value, contact info\n3. Click Save', 'Deal appears in Prospect column with correct values', 'critical', 'functional'),
('pipeline', 'Drag deal between stages', '1. Grab a deal card\n2. Drag to next stage column\n3. Release', 'Deal moves to new stage, stage saved to DB', 'critical', 'functional'),
('pipeline', 'Edit deal inline', '1. Click a deal card\n2. Modify value or contact\n3. Save changes', 'Changes persist after page reload', 'high', 'functional'),
('pipeline', 'Delete deal', '1. Open deal viewer\n2. Click delete\n3. Confirm', 'Deal removed from pipeline and DB', 'high', 'functional'),
('pipeline', 'Bulk select and delete', '1. Check multiple deals\n2. Click bulk delete\n3. Confirm', 'All selected deals removed', 'medium', 'functional'),
('pipeline', 'Bulk stage change', '1. Check multiple deals\n2. Select new stage from dropdown\n3. Apply', 'All selected deals move to new stage', 'medium', 'functional'),
('pipeline', 'Filter by stage', '1. Click stage filter tabs\n2. Switch between stages', 'Only deals in selected stage shown', 'high', 'functional'),
('pipeline', 'Table view toggle', '1. Toggle between kanban and table view', 'Same deals shown in table format with sortable columns', 'medium', 'ui'),
('pipeline', 'CSV import', '1. Click CSV Import\n2. Upload a CSV file\n3. Map columns\n4. Import', 'Deals created from CSV with correct field mapping', 'high', 'integration'),
('pipeline', 'Pipeline mobile kanban', '1. Open pipeline on mobile\n2. Swipe between stages', 'Stages scroll horizontally, cards readable', 'high', 'mobile'),
('pipeline', 'Deal click-through', '1. Click on a deal card', 'Deal viewer opens with full details, contracts, assets, fulfillment', 'critical', 'functional'),

-- CONTRACTS
('contracts', 'Upload PDF contract', '1. Click Upload\n2. Select a PDF file\n3. Wait for AI parsing', 'PDF text extracted, AI populates brand, dates, value, benefits', 'critical', 'functional'),
('contracts', 'Upload Word contract', '1. Click Upload\n2. Select a .docx file\n3. Wait for parsing', 'Word doc parsed, fields populated correctly', 'high', 'functional'),
('contracts', 'AI extract benefits', '1. Open a contract\n2. Click "Extract Benefits"', 'Benefits extracted and matched to existing assets', 'high', 'integration'),
('contracts', 'Change contract status', '1. Open a contract\n2. Change status (Draft → Sent → Signed → Active)', 'Status updates in DB, fulfillment auto-created on Signed', 'critical', 'functional'),
('contracts', 'Generate contract from template', '1. Click Generate\n2. Select deal, choose assets\n3. Generate', 'AI produces professional contract text', 'medium', 'functional'),
('contracts', 'Contract summary', '1. Open a contract with text\n2. Click Summarize', 'AI generates 3-5 bullet point summary', 'low', 'functional'),
('contracts', 'Multi-year annual values', '1. Upload a multi-year contract\n2. Check parsed annual values', 'Annual values correctly split across years', 'high', 'functional'),
('contracts', 'Mobile contract view', '1. Open contracts on mobile\n2. Browse and open a contract', 'Cards stack vertically, text readable, buttons accessible', 'medium', 'mobile'),

-- ASSETS
('assets', 'Create asset', '1. Go to Asset Catalog\n2. Click Add Asset\n3. Fill name, category, price, quantity\n4. Save', 'Asset created with correct category and pricing', 'critical', 'functional'),
('assets', 'Edit asset', '1. Click an asset\n2. Modify fields\n3. Save', 'Changes saved, reflected in asset list', 'high', 'functional'),
('assets', 'Asset categories', '1. Browse all 22 asset categories\n2. Filter by category', 'Categories display correctly, filter works', 'medium', 'functional'),
('assets', 'Asset inventory tracking', '1. Create asset with quantity 10\n2. Assign to contract\n3. Check remaining', 'Available quantity decreases correctly', 'high', 'functional'),

-- FULFILLMENT
('fulfillment', 'Auto-generate fulfillment', '1. Sign a contract with benefits\n2. Check fulfillment tracker', 'Fulfillment records auto-created based on benefit frequency', 'critical', 'functional'),
('fulfillment', 'Mark delivered', '1. Open fulfillment tracker\n2. Toggle a record as delivered\n3. Add notes', 'Record marked delivered with timestamp', 'critical', 'functional'),
('fulfillment', 'Progress tracking', '1. Complete some fulfillment records\n2. Check progress bar', 'Progress bar shows correct percentage', 'high', 'ui'),
('fulfillment', 'Fulfillment by date range', '1. Filter fulfillment by date\n2. Check scheduled items', 'Only items in date range shown', 'medium', 'functional'),

-- DASHBOARD
('dashboard', 'Stage counts', '1. Open Dashboard\n2. Compare counts to pipeline', 'All 6 stage counts match actual deal counts', 'critical', 'functional'),
('dashboard', 'Revenue by year chart', '1. Check revenue chart on dashboard\n2. Compare to contract values', 'Chart shows correct revenue per year', 'high', 'functional'),
('dashboard', 'Recent activity feed', '1. Perform actions (add deal, update contract)\n2. Check dashboard', 'Recent activities shown in chronological order', 'medium', 'functional'),
('dashboard', 'Mobile dashboard', '1. Open dashboard on mobile', 'Cards stack, charts resize, all data visible', 'high', 'mobile'),

-- TEAM
('team', 'Invite team member', '1. Go to Team Manager\n2. Click Invite\n3. Enter email\n4. Send', 'Invitation created, appears in pending list', 'critical', 'functional'),
('team', 'Change member role', '1. Open team member\n2. Change role (admin/rep)\n3. Save', 'Role updated, permissions change immediately', 'high', 'functional'),
('team', 'Remove team member', '1. Click remove on a team member\n2. Confirm', 'Member removed from team, loses access', 'high', 'functional'),

-- SETTINGS
('settings', 'Update profile', '1. Go to Settings\n2. Change name/phone\n3. Save', 'Profile updated in DB', 'high', 'functional'),
('settings', 'Change password', '1. Go to Settings\n2. Enter new password\n3. Save', 'Password changed, can log in with new password', 'critical', 'security'),
('settings', 'Billing info', '1. Go to Settings > Billing\n2. View current plan', 'Current plan and usage displayed correctly', 'medium', 'functional'),

-- AUTH
('auth', 'Sign up flow', '1. Go to /login\n2. Click Sign Up\n3. Enter email/password\n4. Submit', 'Account created, profile auto-generated, redirected to app', 'critical', 'functional'),
('auth', 'Login flow', '1. Go to /login\n2. Enter credentials\n3. Submit', 'Logged in, profile loaded, correct role applied', 'critical', 'functional'),
('auth', 'Session timeout', '1. Log in\n2. Wait for session timeout (or simulate)', 'Warning shown, then redirected to login', 'high', 'security'),
('auth', 'Developer auto-role', '1. Log in as jlkowitt25@gmail.com', 'Role automatically set to developer, all features visible', 'critical', 'security'),
('auth', 'Protected routes', '1. Try accessing /app/developer as non-developer', 'Redirected to /app, no access to dev tools', 'critical', 'security'),

-- SPORTIFY
('sportify', 'Create event', '1. Go to Sportify > Events\n2. Click Create Event\n3. Fill details\n4. Save', 'Event created with date, venue, type', 'high', 'functional'),
('sportify', 'Event detail view', '1. Click on an event\n2. View run-of-show, activations', 'Full event details displayed', 'medium', 'functional'),

-- VALORA
('valora', 'Run valuation', '1. Go to VALORA\n2. Select assets\n3. Run AI valuation', 'Valuation generated with market position and recommendations', 'high', 'functional'),
('valora', 'Link valuation to deal', '1. Create valuation\n2. Link to a deal', 'Valuation appears in deal details', 'medium', 'integration'),

-- BUSINESSNOW
('businessnow', 'View intelligence feed', '1. Open BusinessNow\n2. Check alerts and trends', 'Live intelligence feed with AI insights', 'medium', 'functional'),

-- NEWSLETTER
('newsletter', 'Generate weekly newsletter', '1. Go to Newsletter\n2. Click Generate Weekly', 'Newsletter generated with sourced content', 'high', 'functional'),
('newsletter', 'Generate afternoon update', '1. Go to Newsletter\n2. Click Afternoon Update', 'Short update generated', 'medium', 'functional'),

-- AI FEATURES
('ai', 'Deal insights', '1. Open a deal\n2. Click AI Insights', 'Health score, next actions, risks, opportunities returned', 'high', 'integration'),
('ai', 'Pipeline forecast', '1. Go to pipeline\n2. Click AI Forecast', 'Revenue forecast with 30/60/90 day predictions', 'medium', 'integration'),
('ai', 'Draft email', '1. Open a deal\n2. Click Draft Email\n3. Select type', 'AI generates subject + body in correct tone', 'medium', 'functional'),
('ai', 'Contact enrichment', '1. Enter a contact name + company\n2. Click Enrich', 'Industry, budget range, conversation starters returned', 'medium', 'integration'),
('ai', 'Prospect search', '1. Go to pipeline\n2. Click Find Prospects\n3. Search', 'Real companies returned matching search criteria', 'high', 'integration'),
('ai', 'Claude Code terminal', '1. Go to Business Ops > Claude Code\n2. Ask a code question', 'Detailed code response with file paths and diffs', 'high', 'functional'),
('ai', 'Legacy Helper floating', '1. Click LH button\n2. Switch to Code mode\n3. Ask a question', 'Code-quality response from Opus model', 'medium', 'functional'),

-- GLOBAL
('global', 'Global search', '1. Press Cmd+K\n2. Type a search query', 'Results from deals, contacts, contracts, assets, events, team', 'high', 'functional'),
('global', 'Mobile navigation', '1. Open app on mobile\n2. Use bottom nav + hamburger menu', 'All pages accessible, sidebar slides in/out', 'high', 'mobile'),
('global', 'Error boundary recovery', '1. Trigger a component error\n2. Check error boundary', 'Error caught, user-friendly message shown, auto-recovery attempted', 'critical', 'functional'),
('global', 'Feature flags', '1. Go to Dev Tools\n2. Toggle a feature flag off\n3. Check sidebar', 'Module hidden from sidebar and routes when flag is off', 'high', 'functional'),
('global', 'Industry switching', '1. Change industry in top bar\n2. Check terminology changes', 'All labels update (deals→opportunities, sponsors→donors, etc.)', 'medium', 'functional'),
('global', 'CMS inline editing', '1. Enable Edit Mode\n2. Click editable text\n3. Modify\n4. Save', 'Text saved to ui_content, persists on reload', 'medium', 'functional'),

-- BUSINESS OPS
('businessops', 'Revenue pipeline', '1. Go to Business Ops > Revenue Pipeline', 'Revenue data displayed with deal stages', 'medium', 'functional'),
('businessops', '5-year projections', '1. Go to Projections\n2. Adjust sliders\n3. View chart', 'Chart updates in real-time with slider changes', 'medium', 'functional'),
('businessops', 'Ad spend manager', '1. Add an ad spend record\n2. Track ROI', 'Spend recorded, ROI calculated', 'low', 'functional'),
('businessops', 'Accounting records', '1. Add income/expense\n2. Generate invoice', 'Records saved, invoice PDF generated', 'medium', 'functional'),
('businessops', 'QA tickets', '1. Create manual ticket\n2. Assign to user\n3. Resolve', 'Full ticket lifecycle works', 'high', 'functional'),

-- SECURITY
('security', 'XSS prevention', '1. Enter <script>alert("xss")</script> in form fields\n2. Submit', 'Input sanitized, no script execution', 'critical', 'security'),
('security', 'RLS enforcement', '1. Log in as rep\n2. Try to access another property data', 'No data from other properties visible', 'critical', 'security'),
('security', 'Audit log', '1. Perform actions\n2. Check Dev Tools > Audit', 'All actions logged with timestamp, user, action type', 'high', 'security'),

-- PERFORMANCE
('performance', 'Initial page load', '1. Hard refresh the app\n2. Measure load time', 'App loads in under 3 seconds', 'high', 'performance'),
('performance', 'Pipeline with 100+ deals', '1. Import 100+ deals\n2. Use kanban and table views', 'No lag, smooth scrolling and drag-and-drop', 'medium', 'performance'),
('performance', 'Lazy loading modules', '1. Navigate between modules\n2. Check network tab', 'Each module loads its own chunk, not all at once', 'medium', 'performance');

-- Add marketing test cases
INSERT INTO qa_test_cases (module, title, steps, expected_result, priority, category) VALUES
('marketing', 'Connect social platform', '1. Go to Business Ops > Marketing > Integrations\n2. Click Connect on Instagram\n3. Enter API key and access token\n4. Save', 'Platform shows as connected with green indicator', 'critical', 'functional'),
('marketing', 'Create organic post', '1. Go to Marketing > Create Post\n2. Write caption\n3. Select platforms\n4. Click Save Draft', 'Post saved as draft with correct platforms', 'critical', 'functional'),
('marketing', 'Upload media to post', '1. Create a new post\n2. Click Add Media\n3. Upload image\n4. Save', 'Image uploaded to storage and attached to post', 'high', 'functional'),
('marketing', 'Schedule post', '1. Create post with caption\n2. Set schedule date/time\n3. Click Schedule', 'Post saved with scheduled status and datetime', 'high', 'functional'),
('marketing', 'Publish post directly', '1. Create post\n2. Click Publish Now', 'Post status changes to published with timestamp', 'critical', 'functional'),
('marketing', 'Create ad campaign', '1. Create post\n2. Enable "Make this an Ad"\n3. Set budget, duration, objective\n4. Set target audience\n5. Publish', 'Ad created with budget, targeting, and objective stored', 'high', 'functional'),
('marketing', 'Toggle auto/manual posting', '1. Go to Integrations\n2. Click Auto/Manual toggle on a connected platform', 'Toggle switches between Auto and Manual modes', 'high', 'functional'),
('marketing', 'Disconnect platform', '1. Go to Integrations\n2. Click Disconnect on a connected platform', 'Platform shows disconnected, credentials cleared', 'medium', 'functional'),
('marketing', 'Apply post template', '1. Create templates\n2. Go to Create Post\n3. Click a template', 'Caption and platform selections populated from template', 'medium', 'functional'),
('marketing', 'Filter posts by status', '1. Go to Marketing > Posts\n2. Click different status filters', 'Only posts with selected status shown', 'medium', 'functional'),
('marketing', 'Ads manager stats', '1. Create some ads\n2. Go to Ads Manager tab', 'Shows total ads, active count, total budget, avg budget', 'medium', 'ui'),
('marketing', 'Mobile marketing view', '1. Open Marketing on mobile\n2. Navigate all tabs', 'Dropdown navigation, forms stack, media uploads work', 'high', 'mobile'),

-- Add test data generation cases
('simulator', 'Generate test contracts', '1. Turn on Usage Simulator\n2. Check contracts table', 'Test contracts created with realistic values, dates, and brand names', 'high', 'functional'),
('simulator', 'Generate test revenue by year', '1. Turn on simulator\n2. Check dashboard revenue chart', 'Revenue chart shows data across multiple years from test contracts', 'high', 'functional'),
('simulator', 'Generate test benefits', '1. Turn on simulator\n2. Check contract benefits', 'Benefits auto-linked to assets with quantities and frequencies', 'medium', 'functional'),
('simulator', 'Generate test fulfillment', '1. Turn on simulator\n2. Check fulfillment tracker', 'Fulfillment records with mix of delivered/pending across dates', 'medium', 'functional'),
('simulator', 'Generate test assets', '1. Turn on simulator\n2. Check asset catalog', 'Assets across all categories with pricing and inventory', 'medium', 'functional');

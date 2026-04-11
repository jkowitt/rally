-- Add industry column to newsletters so each industry has its own digest
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS industry text DEFAULT 'sports';
CREATE INDEX IF NOT EXISTS idx_newsletters_industry ON newsletters(industry, type, published_at DESC);

-- Remove the restrictive category check constraint on assets
-- Categories are now dynamic per industry (22+ categories across 8 industries)
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_category_check;

-- Make deal_id nullable on fulfillment_records
-- Contracts uploaded without a linked deal should still create fulfillment records
ALTER TABLE fulfillment_records ALTER COLUMN deal_id DROP NOT NULL;

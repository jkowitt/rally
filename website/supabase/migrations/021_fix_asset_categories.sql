-- Remove the restrictive category check constraint on assets
-- Categories are now dynamic per industry (22+ categories across 8 industries)
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_category_check;

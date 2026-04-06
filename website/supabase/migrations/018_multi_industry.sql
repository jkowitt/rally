-- Multi-industry support: expand property types
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_type_check;
ALTER TABLE properties ADD CONSTRAINT properties_type_check
  CHECK (type IN ('college','professional','minor_league','agency',
    'entertainment','conference','nonprofit','media','esports','realestate','other'));

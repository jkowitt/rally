-- Drop restrictive frequency check on contract_benefits
-- AI may return values outside the original 4 options
ALTER TABLE contract_benefits DROP CONSTRAINT IF EXISTS contract_benefits_frequency_check;

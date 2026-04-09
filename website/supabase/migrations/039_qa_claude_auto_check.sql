-- Add Claude auto-QA columns to test results
ALTER TABLE qa_test_results ADD COLUMN IF NOT EXISTS claude_status text CHECK (claude_status IN ('not_checked', 'passed', 'failed', 'needs_review')) DEFAULT 'not_checked';
ALTER TABLE qa_test_results ADD COLUMN IF NOT EXISTS claude_notes text;
ALTER TABLE qa_test_results ADD COLUMN IF NOT EXISTS claude_checked_at timestamptz;

-- Rename existing status to manual_status for clarity, keep status as-is for backwards compat
-- (we'll use 'status' for manual and add claude_ columns)

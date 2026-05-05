-- ============================================================
-- MIGRATION 085 — WIDEN contracts.status CHECK CONSTRAINT
-- ============================================================
-- The original CHECK from migration 006 only allowed:
--   Draft | In Review | Final | Signed | Expired
--
-- Two newer code paths produce values outside this set:
--   • migration 080 trigger trg_autocreate_contract inserts
--     'Draft — Awaiting PDF' when a deal moves to Contracted
--   • the contracts UI historically wrote 'active' on send-to-AM
--     (front-end has been corrected to 'Signed', but any rows
--     previously inserted on a DB without the constraint still
--     need to round-trip through updates without re-violating)
--
-- This migration drops the old constraint and re-adds a wider one
-- covering every status value the system writes today. UI dropdowns
-- still show only the original 5 — the extras are valid-but-internal.
-- ============================================================

alter table contracts drop constraint if exists contracts_status_check;

alter table contracts add constraint contracts_status_check
  check (status in (
    'Draft',
    'Draft — Awaiting PDF',
    'In Review',
    'Final',
    'Signed',
    'Active',
    'active',                   -- legacy lowercase from older inserts
    'Expired'
  ));

-- Normalize any existing rows that fell through before the check was
-- in place. Lowercase 'active' becomes 'Signed' so renewals + AM logic
-- key off a single canonical value.
update contracts set status = 'Signed' where status = 'active';

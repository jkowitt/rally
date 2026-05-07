-- ============================================================
-- MIGRATION 098 — SEQUENCE GOAL + COMPANY CONTEXT
-- ============================================================
-- Two issues blocked good drafts in 097:
--
--   1. Deals without a separate contacts row were skipped in
--      sequence-generator because prospect_sequence_enrollments
--      requires contact_id NOT NULL. Most early CRM data lives
--      in deals.contact_first_name / contact_email instead, so
--      everything got filtered out and the rep saw "0 drafts".
--      → Make contact_id nullable; uniqueness now handled by
--        coalesce(contact_id, deal_id) so a deal-only enrollment
--        is still single-instance per sequence.
--
--   2. Claude was generating generic outreach because the prompt
--      had no goal, no asks, and no info about the rep's own
--      company. Add three new inputs:
--        prospect_sequences.goal_summary   — what should this
--          cadence accomplish? "Book a discovery call",
--          "Re-engage cold leads", etc.
--        prospect_sequences.initiatives    — talking points to
--          weave in (free text).
--        properties.company_context        — one-time pitch
--          ("We're an AI-first sponsorship CRM for mid-market
--          teams"). Reused on every draft.
-- ============================================================

-- ─── Enrollment contact_id now optional ─────────────────
alter table prospect_sequence_enrollments
  alter column contact_id drop not null;

-- Drop the old strict unique (sequence_id, contact_id) — it
-- can't represent contact-less rows. Replace with a unique
-- index that falls back to deal_id.
alter table prospect_sequence_enrollments
  drop constraint if exists prospect_sequence_enrollments_sequence_id_contact_id_key;

create unique index if not exists uniq_seq_enrollment_target
  on prospect_sequence_enrollments (
    sequence_id,
    coalesce(contact_id, deal_id)
  );

-- ─── Goal + initiatives on the sequence ─────────────────
alter table prospect_sequences
  add column if not exists goal_summary text,
  add column if not exists initiatives text,
  add column if not exists final_ask text;

-- ─── Company-pitch context on the property ──────────────
alter table properties
  add column if not exists company_context text;

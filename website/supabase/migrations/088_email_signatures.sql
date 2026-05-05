-- ============================================================
-- MIGRATION 088 — RICH EMAIL SIGNATURES
-- ============================================================
-- The legacy profiles.email_signature column (added in 072) only
-- holds plain text — useless for the polished signatures reps
-- already use in Gmail / Outlook (logos, formatted name + title,
-- linked phone numbers, social icons). Add an HTML signature field
-- alongside it, plus per-provider overrides so each connected inbox
-- can keep its own.
--
-- Plain-text column is kept as a fallback for plain-text-only sends
-- and clients that strip HTML.
-- ============================================================

alter table profiles
  add column if not exists email_signature_html text;

-- Per-provider override. Each connected inbox can have its own
-- signature pulled from the provider (Gmail) or pasted manually
-- (Outlook). When null, the compose flow falls back to the
-- profile-level email_signature_html, then to email_signature.
alter table outlook_auth
  add column if not exists signature_html text;

alter table gmail_auth
  add column if not exists signature_html text;

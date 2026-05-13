-- ============================================================
-- MIGRATION 057 — REMOVE COMPETITOR REFERENCES FROM PRICING PAGE
-- ============================================================
-- Replaces direct competitor name references in the pricing page
-- comparison callout and FAQ with category-neutral language. Idempotent
-- — safe to run after migration 055 even if these strings have been
-- edited via the developer pricing control center.
--
-- Only updates rows where the value still matches the original
-- competitor-named seed text, so manual edits in /dev/pricing/page
-- are preserved.
-- ============================================================

-- Update the comparison callout
update pricing_page_config
set
  config_value = 'Legacy enterprise sponsorship CRMs charge $15,000+/year. Loud CRM Pro is $199/month. Same category. 18 AI features they don''t have. 1/10th the price.',
  updated_at = now()
where config_key = 'comparison_callout'
  and config_value = 'SponsorCX charges $15,000/year. Loud CRM Pro is $199/month. Same category. 18 AI features they don''t have. 1/10th the price.';

-- Update the "Why is Loud CRM so much cheaper" FAQ
update pricing_page_faqs
set
  question = 'Why is Loud CRM so much cheaper than legacy sponsorship CRMs?',
  answer = 'Legacy sponsorship CRMs were built for an era before AI automation made it possible to dramatically reduce the cost of sophisticated software. We built Loud CRM from the ground up with AI at the core, which means we can deliver more features at a fraction of the cost.',
  updated_at = now()
where question = 'Why is Loud CRM so much cheaper than SponsorCX?';

-- ============================================================
-- DONE
-- ============================================================

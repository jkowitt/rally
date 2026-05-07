-- ============================================================
-- MIGRATION 093 — DEV-TOOLS TOGGLE FOR ADD-ON PANEL
-- ============================================================
-- The "Additional Features" + "Suggest a Feature" buttons in the
-- bottom-left of the sidebar are hidden by default for the launch
-- positioning (CRM + Prospecting only). A developer can flip
-- feature_flags.dev_addon_panel = true from /app/developer to
-- bring them back when the add-on catalog is ready to ship.
-- ============================================================

insert into feature_flags (module, enabled) values
  ('dev_addon_panel', false)
on conflict (module) do nothing;

-- ============================================================
-- MIGRATION 061 — STORAGE BUCKETS
-- ============================================================
-- Creates the storage buckets the app references but that weren't
-- being created in any migration. The AutoQA engine's upload probe
-- caught this — the 'media' bucket used by MarketingHub wasn't
-- actually created by any migration, it was expected to exist.
--
-- Creates both:
--   - 'media' — used by MarketingHub, AutoQA upload probe, and
--     the QA comments screenshot feature (when wired)
--   - 'contract-migrations' — used by the bulk contract migration
--     system (contractMigrationService.js)
--
-- Policies are created via DO blocks so a failure to create one
-- policy (e.g. already exists in some other form) doesn't block
-- the whole migration.
-- ============================================================

-- ─── Create buckets ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('media', 'media', false),
  ('contract-migrations', 'contract-migrations', false)
on conflict (id) do nothing;

-- ─── Policies for 'media' bucket ────────────────────────────
-- Any authenticated user can upload/read their own files in media.
-- Developer can read/delete anything.
do $$
begin
  -- Drop any existing policies so this is idempotent
  drop policy if exists "media_upload" on storage.objects;
  drop policy if exists "media_read" on storage.objects;
  drop policy if exists "media_update" on storage.objects;
  drop policy if exists "media_delete" on storage.objects;

  create policy "media_upload" on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'media');

  create policy "media_read" on storage.objects
    for select
    using (bucket_id = 'media');

  create policy "media_update" on storage.objects
    for update
    to authenticated
    using (bucket_id = 'media')
    with check (bucket_id = 'media');

  create policy "media_delete" on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'media');
exception when others then
  raise notice 'media bucket policies: %', sqlerrm;
end $$;

-- ─── Policies for 'contract-migrations' bucket ──────────────
-- Path structure: {property_id}/{session_id}/{timestamp}_{filename}
-- Only authenticated users can upload. Developer can read/delete all.
do $$
begin
  drop policy if exists "contract_migrations_upload" on storage.objects;
  drop policy if exists "contract_migrations_read" on storage.objects;
  drop policy if exists "contract_migrations_delete" on storage.objects;

  create policy "contract_migrations_upload" on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'contract-migrations');

  create policy "contract_migrations_read" on storage.objects
    for select
    to authenticated
    using (bucket_id = 'contract-migrations');

  create policy "contract_migrations_delete" on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'contract-migrations');
exception when others then
  raise notice 'contract-migrations bucket policies: %', sqlerrm;
end $$;

-- ============================================================
-- DONE
-- ============================================================

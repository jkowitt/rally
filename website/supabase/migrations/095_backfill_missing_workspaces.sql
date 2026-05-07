-- ============================================================
-- MIGRATION 095 — BACKFILL MISSING WORKSPACES
-- ============================================================
-- Two existing-user states leak through earlier sign-up flows
-- and leave the account unusable (RLS scopes everything to
-- nothing without a property):
--
--   • profile.property_id IS NULL
--       Email-confirmation signups returned early before the
--       LoginPage property creation step ran.
--
--   • profile.property_id points to a deleted properties row
--       Orphaned FK from a property that was removed manually
--       or via a cascade upstream.
--
-- For both groups, create a fresh "free" properties row named
-- after the user (full_name → email → "My Workspace" fallback)
-- and link the profile to it. Idempotent — re-running this
-- only touches profiles still missing a usable property.
-- ============================================================

do $$
declare
  rec record;
  v_name text;
  v_property_id uuid;
begin
  for rec in
    select p.id as profile_id, p.full_name, p.email, p.property_id
    from profiles p
    left join properties pr on pr.id = p.property_id
    where p.property_id is null or pr.id is null
  loop
    -- Pick the friendliest name we have. "My Workspace" is the
    -- final fallback so we never insert NULL into a NOT NULL column.
    v_name := coalesce(
      nullif(trim(rec.full_name), ''),
      nullif(trim(split_part(coalesce(rec.email, ''), '@', 1)), ''),
      'My Workspace'
    );
    if v_name not ilike '% workspace%' then
      v_name := v_name || '''s Workspace';
    end if;

    insert into properties (
      name, plan, billing_email,
      trial_started_at, trial_ends_at
    ) values (
      v_name, 'free', rec.email,
      now(), now() + interval '7 days'
    )
    returning id into v_property_id;

    update profiles
      set property_id = v_property_id
      where id = rec.profile_id;

    raise notice 'backfilled property % (%) for profile %',
      v_property_id, v_name, rec.profile_id;
  end loop;
end $$;

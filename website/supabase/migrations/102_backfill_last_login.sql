-- ============================================================
-- MIGRATION 102 — BACKFILL profiles.last_login FROM login_history
-- ============================================================
-- The last_login column has existed since migration 017 but
-- nothing ever wrote to it. useAuth.signIn now stamps it on every
-- successful login, but every existing user still shows "never
-- signed in" in Dev Tools until they sign in again.
--
-- Backfill from the login_history table — pick each user's most
-- recent successful login and copy that timestamp into profiles.
-- Idempotent: a re-run only updates rows where the existing value
-- is older than the latest known login.
-- ============================================================

with latest_login as (
  select
    user_id,
    max(login_at) as last_at
  from login_history
  where success = true
    and user_id is not null
  group by user_id
)
update profiles p
   set last_login = l.last_at
  from latest_login l
 where p.id = l.user_id
   and (p.last_login is null or p.last_login < l.last_at);

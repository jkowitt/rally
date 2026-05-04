-- ============================================================
-- MIGRATION 082 — ADD-ON PURCHASE MODES
-- ============================================================
-- Splits the 16 seeded add-ons into two purchase paths:
--
--   • contact_sales — strategic / high-touch / requires setup.
--                     User submits a request; admin approves.
--                     (Existing Contact-Sales flow from 081.)
--
--   • self_serve    — small toggles, pure software, no setup.
--                     User clicks Buy now → Stripe Checkout →
--                     webhook flips property_addons row → addon
--                     instantly active for everyone on the property.
--
-- Classification rationale:
--   Contact-Sales: anything that requires human config, custom
--   contracts, third-party provisioning, or enterprise compliance.
--   Self-Serve: pure software toggles where shipping costs nothing
--   marginal and the value is obvious before a sales call.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ADD COLUMNS — purchase_mode + Stripe references
-- ────────────────────────────────────────────────────────────
alter table addon_catalog
  add column if not exists purchase_mode text not null default 'contact_sales'
    check (purchase_mode in ('contact_sales', 'self_serve'));

alter table addon_catalog
  add column if not exists unit_price_cents integer;        -- null for contact_sales

alter table addon_catalog
  add column if not exists billing_interval text default 'month'
    check (billing_interval in ('month', 'year'));

alter table addon_catalog
  add column if not exists stripe_price_id text;            -- set per environment after Stripe setup

alter table addon_catalog
  add column if not exists per_seat boolean not null default false; -- true = priced per user under property

-- ────────────────────────────────────────────────────────────
-- 2. CLASSIFY THE 16 SEEDED ADD-ONS
-- ────────────────────────────────────────────────────────────
-- Self-serve: pure software toggles. Default monthly prices set as
-- placeholders (operator overrides via /dev/pricing once real
-- Stripe Price IDs are wired). Prices are intentionally small to
-- maximize conversion; raise via the admin UI after product-led
-- pricing tests.
update addon_catalog set
  purchase_mode = 'self_serve',
  unit_price_cents = 4900,                -- $49 / property / month
  billing_interval = 'month',
  per_seat = false,
  price_hint = '$49/mo per property'
  where key = 'funding_radar';

update addon_catalog set
  purchase_mode = 'self_serve',
  unit_price_cents = 2900,                -- $29 / property / month
  billing_interval = 'month',
  per_seat = false,
  price_hint = '$29/mo per property'
  where key = 'personality_profiles';

update addon_catalog set
  purchase_mode = 'self_serve',
  unit_price_cents = 900,                 -- $9 / seat / month
  billing_interval = 'month',
  per_seat = true,
  price_hint = '$9/mo per seat'
  where key = 'daily_digests';

update addon_catalog set
  purchase_mode = 'self_serve',
  unit_price_cents = 4900,                -- $49 / property / month
  billing_interval = 'month',
  per_seat = false,
  price_hint = '$49/mo per property'
  where key = 'ab_sequences';

update addon_catalog set
  purchase_mode = 'self_serve',
  unit_price_cents = 9900,                -- $99 / property / month — hot upgrade
  billing_interval = 'month',
  per_seat = false,
  price_hint = '$99/mo per property'
  where key = 'premium_ai';

-- Everything else explicitly stays contact_sales (default), but we
-- write the price_hint so the catalog UI shows it consistently.
update addon_catalog set
  purchase_mode = 'contact_sales',
  price_hint = 'Contact sales'
  where key in (
    'phone_calls',
    'public_api',
    'activations',
    'valora',
    'businessnow',
    'email_marketing',
    'white_label_portal',
    'dedicated_csm',
    'premium_support',
    'soc2_compliance',
    'multi_property'
  );

-- ────────────────────────────────────────────────────────────
-- 3. CHECKOUT-SESSION TRACKING
-- ────────────────────────────────────────────────────────────
-- When a user kicks off a self-serve checkout, we stash the
-- intended addon + property here. The Stripe webhook reads this
-- on checkout.session.completed and inserts the property_addons
-- row. Survives if the user closes the tab mid-flow.
create table if not exists addon_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  property_id uuid not null references properties(id) on delete cascade,
  addon_key text not null references addon_catalog(key) on delete cascade,
  initiated_by uuid references profiles(id) on delete set null,
  status text not null default 'pending',     -- 'pending' | 'completed' | 'cancelled' | 'failed'
  amount_cents integer,
  stripe_subscription_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_addon_checkout_property on addon_checkout_sessions(property_id, created_at desc);
create index if not exists idx_addon_checkout_session on addon_checkout_sessions(stripe_session_id);

alter table addon_checkout_sessions enable row level security;
create policy "addon_checkout_property_read" on addon_checkout_sessions for select using (
  property_id = get_user_property_id() or is_developer()
);
-- Service role writes via the edge function; users don't insert directly.

-- ────────────────────────────────────────────────────────────
-- 4. AUTO-ENABLE TRIGGER ON CHECKOUT COMPLETED
-- ────────────────────────────────────────────────────────────
-- When the webhook flips an addon_checkout_sessions row to
-- 'completed', insert (or refresh) the property_addons row so the
-- feature instantly unlocks for every user on the property —
-- useAddons subscribes to property_addons via realtime, so the UI
-- updates without a refresh.
create or replace function enable_addon_on_checkout_complete() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_addon_name text;
begin
  if old.status is not distinct from new.status then return new; end if;
  if new.status <> 'completed' then return new; end if;

  insert into property_addons (property_id, addon_key, enabled_by, notes)
    values (new.property_id, new.addon_key, new.initiated_by,
            'Self-serve Stripe checkout · session ' || new.stripe_session_id)
    on conflict (property_id, addon_key) do update set
      enabled_at = now(),
      enabled_by = excluded.enabled_by,
      expires_at = null,
      notes = excluded.notes;

  -- Notify the user who initiated the checkout.
  select name into v_addon_name from addon_catalog where key = new.addon_key;
  if new.initiated_by is not null then
    insert into user_notifications (user_id, type, title, body, link, icon, metadata)
      values (
        new.initiated_by, 'addon_purchased',
        coalesce(v_addon_name, new.addon_key) || ' is now active',
        'Your purchase succeeded. The add-on is unlocked for everyone on the property.',
        '/app/settings#addons',
        '🎉',
        jsonb_build_object('addon_key', new.addon_key, 'session_id', new.stripe_session_id)
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enable_addon_on_checkout on addon_checkout_sessions;
create trigger trg_enable_addon_on_checkout
  after update of status on addon_checkout_sessions
  for each row execute function enable_addon_on_checkout_complete();

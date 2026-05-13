-- ============================================================
-- MIGRATION 068 — STANDALONE SEO + SELF-HOSTED ANALYTICS
-- ============================================================
-- Two concerns combined because they share the same deployment
-- lifecycle and both feed into the pre-render proxy:
--
-- 1. seo_meta: per-page SEO metadata (title, description, og tags,
--    JSON-LD, canonical URL, robots directive). Auto-populated
--    when Digest issues are published; manually editable for
--    static pages.
--
-- 2. page_views: first-party analytics replacing Google Analytics.
--    Lightweight event tracking with no cookies, no PII, and no
--    third-party dependencies. GDPR-friendly by design.
-- ============================================================

-- ========================
-- 1. SEO META
-- ========================
create table if not exists seo_meta (
  id uuid primary key default gen_random_uuid(),
  page_path text not null unique,
  title text,
  description text,
  og_title text,
  og_description text,
  og_image_url text,
  og_type text default 'website',
  twitter_card text default 'summary_large_image',
  canonical_url text,
  robots text default 'index,follow',
  json_ld jsonb default '{}'::jsonb,
  keywords text[] default '{}',
  auto_generated boolean default false,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_seo_meta_path on seo_meta(page_path);

alter table seo_meta enable row level security;
create policy "seo_meta_public_read" on seo_meta for select using (true);
create policy "seo_meta_dev_write" on seo_meta
  for all using (is_developer()) with check (is_developer());

-- Seed SEO meta for known static pages
insert into seo_meta (page_path, title, description, og_title, og_description, robots, json_ld) values
(
  '/',
  'Loud CRM — AI Sponsorship CRM | Contract Parsing in 30 Seconds',
  'Upload any sponsor contract. AI extracts every benefit in 30 seconds. The sponsorship CRM built for teams drowning in spreadsheets.',
  'Loud CRM — AI Sponsorship CRM',
  'Upload any sponsor contract. AI extracts every benefit in 30 seconds. $39/mo — not $15K/year.',
  'index,follow',
  '{"@context":"https://schema.org","@type":"WebSite","name":"Loud CRM","url":"https://loud-legacy.com","description":"AI-powered sponsorship CRM for sports teams, event organizers, and partnership agencies.","potentialAction":{"@type":"SearchAction","target":"https://loud-legacy.com/digest?q={search_term_string}","query-input":"required name=search_term_string"}}'::jsonb
),
(
  '/pricing',
  'Pricing — Loud CRM | Free, Starter $39/mo, Pro $199/mo',
  'Simple, transparent pricing. Start free, upgrade when you need more. AI credits, contract parsing, and verified contacts included.',
  'Loud CRM Pricing',
  'Start free. Upgrade when ready. No surprise charges.',
  'index,follow',
  '{"@context":"https://schema.org","@type":"WebPage","name":"Loud CRM Pricing","description":"Plans and pricing for Loud CRM sponsorship CRM."}'::jsonb
),
(
  '/digest',
  'The Digest by Loud CRM Ventures — Monthly Business Newsletter',
  'One good article a month on sponsorship, real estate, sports business, and marketing. Subscribe free.',
  'The Digest by Loud CRM Ventures',
  'One good article a month. No spam.',
  'index,follow',
  '{"@context":"https://schema.org","@type":"CollectionPage","name":"The Digest Archive","description":"Monthly editorial newsletter by Loud CRM Ventures."}'::jsonb
),
(
  '/compare',
  'Compare Loud CRM vs Alternatives — Feature Comparison',
  'See how Loud CRM stacks up against other sponsorship CRM tools. Feature-by-feature comparison.',
  'Loud CRM vs Alternatives',
  'Feature-by-feature comparison with other tools.',
  'index,follow',
  '{}'::jsonb
)
on conflict (page_path) do nothing;

-- ========================
-- 2. AUTO-POPULATE SEO ON DIGEST PUBLISH
-- ========================
-- When a digest_issues row transitions to 'published', auto-upsert
-- a seo_meta row for /digest/:slug with Article schema.
create or replace function auto_populate_digest_seo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
  v_excerpt text;
  v_site_url text := 'https://loud-legacy.com';
  v_json_ld jsonb;
begin
  if new.status != 'published' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'published' then return new; end if;

  v_path := '/digest/' || new.slug;
  v_excerpt := left(regexp_replace(
    regexp_replace(coalesce(new.body_markdown, ''), E'[#*>\\[\\]()!`]', '', 'g'),
    E'\\s+', ' ', 'g'
  ), 160);

  v_json_ld := jsonb_build_object(
    '@context', 'https://schema.org',
    '@type', 'Article',
    'headline', new.title,
    'description', coalesce(new.meta_description, new.subtitle, v_excerpt),
    'author', jsonb_build_object('@type', 'Organization', 'name', coalesce(new.author, 'Loud CRM Ventures')),
    'publisher', jsonb_build_object('@type', 'Organization', 'name', 'Loud CRM Ventures'),
    'datePublished', to_char(coalesce(new.published_at, now()), 'YYYY-MM-DD'),
    'url', v_site_url || v_path,
    'mainEntityOfPage', v_site_url || v_path,
    'image', coalesce(new.featured_image_url, '')
  );

  insert into seo_meta (
    page_path, title, description, og_title, og_description,
    og_image_url, og_type, canonical_url, robots,
    json_ld, auto_generated, last_generated_at
  ) values (
    v_path,
    new.title || ' — The Digest by Loud CRM',
    coalesce(new.meta_description, new.subtitle, v_excerpt),
    new.title,
    coalesce(new.subtitle, v_excerpt),
    new.featured_image_url,
    'article',
    v_site_url || v_path,
    'index,follow',
    v_json_ld,
    true,
    now()
  )
  on conflict (page_path) do update set
    title = excluded.title,
    description = excluded.description,
    og_title = excluded.og_title,
    og_description = excluded.og_description,
    og_image_url = excluded.og_image_url,
    og_type = excluded.og_type,
    canonical_url = excluded.canonical_url,
    json_ld = excluded.json_ld,
    auto_generated = true,
    last_generated_at = now(),
    updated_at = now();

  return new;
exception
  when others then
    raise notice 'auto_populate_digest_seo failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists digest_seo_trigger on digest_issues;
create trigger digest_seo_trigger
  after insert or update on digest_issues
  for each row
  execute function auto_populate_digest_seo();

-- ========================
-- 3. PAGE VIEWS (Self-hosted Analytics)
-- ========================
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  user_agent text,
  country text,
  session_id text,
  duration_ms integer,
  scroll_depth integer,
  is_bot boolean default false,
  screen_width integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_page_views_path on page_views(page_path, created_at desc);
create index if not exists idx_page_views_time on page_views(created_at desc);
create index if not exists idx_page_views_session on page_views(session_id);

-- Page views are public-write (anonymous visitors can post) but only
-- developers/admins can read the aggregate data.
alter table page_views enable row level security;
create policy "page_views_insert" on page_views
  for insert with check (true);
create policy "page_views_read" on page_views
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('developer', 'admin', 'businessops'))
  );

-- ========================
-- 4. DAILY AGGREGATES (materialized for dashboard performance)
-- ========================
create table if not exists page_view_daily (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  view_date date not null,
  view_count integer not null default 0,
  unique_sessions integer not null default 0,
  avg_duration_ms integer,
  avg_scroll_depth integer,
  bot_count integer not null default 0,
  top_referrer text,
  created_at timestamptz not null default now(),
  unique(page_path, view_date)
);

create index if not exists idx_pvd_date on page_view_daily(view_date desc);
create index if not exists idx_pvd_path on page_view_daily(page_path, view_date desc);

alter table page_view_daily enable row level security;
create policy "pvd_read" on page_view_daily
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('developer', 'admin', 'businessops'))
  );
create policy "pvd_write" on page_view_daily
  for all using (is_developer()) with check (is_developer());

-- ========================
-- 5. PRE-RENDER CACHE TABLE
-- ========================
-- The pre-render proxy stores rendered HTML here so subsequent bot
-- requests are served from cache without re-rendering. TTL is
-- managed by the proxy (deletes stale rows on check).
create table if not exists prerender_cache (
  page_path text primary key,
  html text not null,
  rendered_at timestamptz not null default now(),
  ttl_hours integer not null default 24,
  invalidated boolean not null default false
);

alter table prerender_cache enable row level security;
create policy "prerender_cache_public_read" on prerender_cache
  for select using (true);
create policy "prerender_cache_dev_write" on prerender_cache
  for all using (is_developer()) with check (is_developer());

-- Auto-invalidate prerender cache when a digest article is published or updated
create or replace function invalidate_prerender_on_digest_change()
returns trigger
language plpgsql
security definer
as $$
begin
  update prerender_cache
  set invalidated = true
  where page_path = '/digest/' || new.slug
     or page_path = '/digest';
  return new;
exception
  when others then return new;
end;
$$;

drop trigger if exists digest_prerender_invalidate on digest_issues;
create trigger digest_prerender_invalidate
  after update on digest_issues
  for each row
  execute function invalidate_prerender_on_digest_change();

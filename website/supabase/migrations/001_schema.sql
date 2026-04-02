-- ============================================================
-- LOUD LEGACY — FULL DATABASE SCHEMA
-- ============================================================

-- Properties
create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text,
  conference text,
  city text,
  state text,
  created_at timestamptz default now()
);

-- Profiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  property_id uuid references properties on delete set null,
  full_name text,
  role text check (role in ('admin','rep','developer')) default 'rep',
  terms_accepted boolean default false,
  terms_accepted_at timestamptz,
  privacy_accepted boolean default false,
  privacy_accepted_at timestamptz,
  created_at timestamptz default now()
);

-- Feature Flags
create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  module text unique not null check (module in ('crm','sportify','valora','businessnow')),
  enabled boolean default false,
  updated_at timestamptz default now()
);

insert into feature_flags (module, enabled) values
  ('crm', true),
  ('sportify', false),
  ('valora', false),
  ('businessnow', false);

-- UI Content (editable strings)
create table ui_content (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  updated_at timestamptz default now()
);

-- Legal Documents (versioned)
create table legal_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('terms_of_service','privacy_policy','user_agreement')),
  version text not null,
  content text not null,
  effective_date date not null default current_date,
  created_at timestamptz default now()
);

-- Legal Acceptances (audit log)
create table legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  document_type text not null,
  document_version text not null,
  accepted_at timestamptz default now(),
  ip_address text
);

-- Assets
create table assets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  name text not null,
  category text not null check (category in (
    'LED Board','Jersey Patch','Radio Read','Social Post',
    'Naming Right','Signage','Activation Space','Digital'
  )),
  description text,
  quantity integer default 1,
  base_price numeric,
  impressions_per_game integer,
  active boolean default true,
  notes text,
  created_at timestamptz default now()
);

-- Deals
create table deals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  brand_name text not null,
  contact_name text,
  contact_email text,
  value numeric,
  start_date date,
  end_date date,
  stage text check (stage in (
    'Prospect','Proposal Sent','Negotiation','Contracted','In Fulfillment','Renewed'
  )) default 'Prospect',
  renewal_flag boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Deal Assets (join)
create table deal_assets (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals on delete cascade,
  asset_id uuid not null references assets on delete restrict,
  quantity integer default 1,
  custom_price numeric
);

-- Contracts
create table contracts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals on delete cascade,
  property_id uuid not null references properties on delete cascade,
  brand_name text,
  contract_number text,
  effective_date date,
  expiration_date date,
  total_value numeric,
  signed boolean default false,
  signed_date date,
  signed_document_url text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- Contract Benefits
create table contract_benefits (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts on delete cascade,
  asset_id uuid references assets,
  benefit_description text,
  quantity integer,
  frequency text check (frequency in ('Per Game','Per Month','Per Season','One Time')),
  value numeric,
  fulfillment_auto_generated boolean default false
);

-- Fulfillment Records
create table fulfillment_records (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals on delete cascade,
  contract_id uuid references contracts,
  asset_id uuid references assets,
  benefit_id uuid references contract_benefits,
  scheduled_date date,
  delivered boolean default false,
  delivery_notes text,
  auto_generated boolean default false,
  created_at timestamptz default now()
);

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  name text not null,
  event_date timestamptz,
  venue text,
  event_type text check (event_type in (
    'Game Day','Tournament','Banquet','Clinic','Fundraiser','Other'
  )),
  status text check (status in ('Planning','Confirmed','In Progress','Completed')) default 'Planning',
  notes text,
  created_at timestamptz default now()
);

-- Event Tasks
create table event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  task_name text,
  assigned_to text,
  due_date date,
  completed boolean default false,
  notes text
);

-- Event Vendors
create table event_vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  vendor_name text,
  category text,
  contact_name text,
  contact_email text,
  confirmed boolean default false,
  notes text
);

-- Event Activations
create table event_activations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  deal_id uuid references deals,
  activation_description text,
  location text,
  setup_time text,
  completed boolean default false
);

-- Valuations
create table valuations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  asset_id uuid references assets,
  game_date date,
  broadcast_minutes numeric,
  screen_share_percent numeric,
  clarity_score numeric default 1.0,
  audience_size integer,
  cpp numeric,
  calculated_emv numeric,
  claude_suggested_emv numeric,
  claude_reasoning text,
  created_at timestamptz default now()
);

-- Valuation Training Data
create table valuation_training_data (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties on delete cascade,
  asset_id uuid references assets,
  asset_category text,
  market text,
  audience_size integer,
  broadcast_minutes numeric,
  screen_share_percent numeric,
  clarity_score numeric,
  actual_emv numeric,
  external_benchmark numeric,
  source text,
  created_at timestamptz default now()
);

-- Claude Context
create table claude_context (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties on delete cascade,
  context_type text check (context_type in (
    'valuation_benchmark','market_rate','audience_data','competitor_deal'
  )),
  content jsonb,
  source text,
  last_updated timestamptz default now(),
  active boolean default true
);

-- Daily Intelligence Log
create table daily_intelligence_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties on delete cascade,
  run_date date,
  module text,
  summary text,
  recommendations jsonb,
  data_snapshot jsonb,
  created_at timestamptz default now()
);

-- Business Metrics
create table business_metrics (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties on delete cascade,
  metric_name text,
  metric_value numeric,
  metric_date date,
  category text,
  notes text
);

-- Data Exports
create table data_exports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties on delete cascade,
  exported_by uuid references auth.users,
  export_type text check (export_type in (
    'full_backup','crm_data','contracts','valuations','fulfillment','events'
  )),
  file_url text,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- User Events (analytics)
create table user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  event_type text,
  module text,
  metadata jsonb,
  created_at timestamptz default now()
);

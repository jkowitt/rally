-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper: get current user's property_id
create or replace function get_user_property_id()
returns uuid as $$
  select property_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Helper: check if current user is developer
create or replace function is_developer()
returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'developer')
$$ language sql security definer stable;

-- ========================
-- PROPERTIES
-- ========================
alter table properties enable row level security;

create policy "properties_select" on properties for select using (
  is_developer() or id = get_user_property_id()
);
create policy "properties_insert" on properties for insert with check (is_developer());
create policy "properties_update" on properties for update using (
  is_developer() or id = get_user_property_id()
);
create policy "properties_delete" on properties for delete using (is_developer());

-- ========================
-- PROFILES
-- ========================
alter table profiles enable row level security;

create policy "profiles_select" on profiles for select using (
  is_developer() or property_id = get_user_property_id() or id = auth.uid()
);
create policy "profiles_insert" on profiles for insert with check (id = auth.uid() or is_developer());
create policy "profiles_update" on profiles for update using (
  id = auth.uid() or is_developer()
);

-- ========================
-- FEATURE FLAGS (read all, write developer only)
-- ========================
alter table feature_flags enable row level security;

create policy "flags_select" on feature_flags for select using (true);
create policy "flags_update" on feature_flags for update using (is_developer());

-- ========================
-- UI CONTENT (read all, write developer only)
-- ========================
alter table ui_content enable row level security;

create policy "ui_select" on ui_content for select using (true);
create policy "ui_insert" on ui_content for insert with check (is_developer());
create policy "ui_update" on ui_content for update using (is_developer());

-- ========================
-- LEGAL DOCUMENTS (read all, write developer only)
-- ========================
alter table legal_documents enable row level security;

create policy "legal_docs_select" on legal_documents for select using (true);
create policy "legal_docs_insert" on legal_documents for insert with check (is_developer());
create policy "legal_docs_update" on legal_documents for update using (is_developer());

-- ========================
-- LEGAL ACCEPTANCES (user writes own, developer reads all)
-- ========================
alter table legal_acceptances enable row level security;

create policy "acceptances_select" on legal_acceptances for select using (
  user_id = auth.uid() or is_developer()
);
create policy "acceptances_insert" on legal_acceptances for insert with check (
  user_id = auth.uid()
);

-- ========================
-- PROPERTY-SCOPED TABLES MACRO
-- ========================

-- Assets
alter table assets enable row level security;
create policy "assets_select" on assets for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "assets_insert" on assets for insert with check (
  is_developer() or property_id = get_user_property_id()
);
create policy "assets_update" on assets for update using (
  is_developer() or property_id = get_user_property_id()
);
create policy "assets_delete" on assets for delete using (
  is_developer() or property_id = get_user_property_id()
);

-- Deals
alter table deals enable row level security;
create policy "deals_select" on deals for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "deals_insert" on deals for insert with check (
  is_developer() or property_id = get_user_property_id()
);
create policy "deals_update" on deals for update using (
  is_developer() or property_id = get_user_property_id()
);
create policy "deals_delete" on deals for delete using (
  is_developer() or property_id = get_user_property_id()
);

-- Deal Assets
alter table deal_assets enable row level security;
create policy "deal_assets_select" on deal_assets for select using (
  is_developer() or exists(
    select 1 from deals where deals.id = deal_assets.deal_id
    and deals.property_id = get_user_property_id()
  )
);
create policy "deal_assets_insert" on deal_assets for insert with check (
  is_developer() or exists(
    select 1 from deals where deals.id = deal_assets.deal_id
    and deals.property_id = get_user_property_id()
  )
);
create policy "deal_assets_update" on deal_assets for update using (
  is_developer() or exists(
    select 1 from deals where deals.id = deal_assets.deal_id
    and deals.property_id = get_user_property_id()
  )
);
create policy "deal_assets_delete" on deal_assets for delete using (
  is_developer() or exists(
    select 1 from deals where deals.id = deal_assets.deal_id
    and deals.property_id = get_user_property_id()
  )
);

-- Contracts
alter table contracts enable row level security;
create policy "contracts_select" on contracts for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "contracts_insert" on contracts for insert with check (
  is_developer() or property_id = get_user_property_id()
);
create policy "contracts_update" on contracts for update using (
  is_developer() or property_id = get_user_property_id()
);
create policy "contracts_delete" on contracts for delete using (
  is_developer() or property_id = get_user_property_id()
);

-- Contract Benefits
alter table contract_benefits enable row level security;
create policy "benefits_select" on contract_benefits for select using (
  is_developer() or exists(
    select 1 from contracts where contracts.id = contract_benefits.contract_id
    and contracts.property_id = get_user_property_id()
  )
);
create policy "benefits_insert" on contract_benefits for insert with check (
  is_developer() or exists(
    select 1 from contracts where contracts.id = contract_benefits.contract_id
    and contracts.property_id = get_user_property_id()
  )
);
create policy "benefits_update" on contract_benefits for update using (
  is_developer() or exists(
    select 1 from contracts where contracts.id = contract_benefits.contract_id
    and contracts.property_id = get_user_property_id()
  )
);
create policy "benefits_delete" on contract_benefits for delete using (
  is_developer() or exists(
    select 1 from contracts where contracts.id = contract_benefits.contract_id
    and contracts.property_id = get_user_property_id()
  )
);

-- Fulfillment Records
alter table fulfillment_records enable row level security;
create policy "fulfillment_select" on fulfillment_records for select using (
  is_developer() or exists(
    select 1 from deals where deals.id = fulfillment_records.deal_id
    and deals.property_id = get_user_property_id()
  )
);
create policy "fulfillment_insert" on fulfillment_records for insert with check (
  is_developer() or exists(
    select 1 from deals where deals.id = fulfillment_records.deal_id
    and deals.property_id = get_user_property_id()
  )
);
create policy "fulfillment_update" on fulfillment_records for update using (
  is_developer() or exists(
    select 1 from deals where deals.id = fulfillment_records.deal_id
    and deals.property_id = get_user_property_id()
  )
);
create policy "fulfillment_delete" on fulfillment_records for delete using (
  is_developer() or exists(
    select 1 from deals where deals.id = fulfillment_records.deal_id
    and deals.property_id = get_user_property_id()
  )
);

-- Events
alter table events enable row level security;
create policy "events_select" on events for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "events_insert" on events for insert with check (
  is_developer() or property_id = get_user_property_id()
);
create policy "events_update" on events for update using (
  is_developer() or property_id = get_user_property_id()
);
create policy "events_delete" on events for delete using (
  is_developer() or property_id = get_user_property_id()
);

-- Event Tasks
alter table event_tasks enable row level security;
create policy "tasks_select" on event_tasks for select using (
  is_developer() or exists(
    select 1 from events where events.id = event_tasks.event_id
    and events.property_id = get_user_property_id()
  )
);
create policy "tasks_insert" on event_tasks for insert with check (
  is_developer() or exists(
    select 1 from events where events.id = event_tasks.event_id
    and events.property_id = get_user_property_id()
  )
);
create policy "tasks_update" on event_tasks for update using (
  is_developer() or exists(
    select 1 from events where events.id = event_tasks.event_id
    and events.property_id = get_user_property_id()
  )
);
create policy "tasks_delete" on event_tasks for delete using (
  is_developer() or exists(
    select 1 from events where events.id = event_tasks.event_id
    and events.property_id = get_user_property_id()
  )
);

-- Event Vendors
alter table event_vendors enable row level security;
create policy "vendors_select" on event_vendors for select using (
  is_developer() or exists(
    select 1 from events where events.id = event_vendors.event_id
    and events.property_id = get_user_property_id()
  )
);
create policy "vendors_insert" on event_vendors for insert with check (
  is_developer() or exists(
    select 1 from events where events.id = event_vendors.event_id
    and events.property_id = get_user_property_id()
  )
);
create policy "vendors_update" on event_vendors for update using (
  is_developer() or exists(
    select 1 from events where events.id = event_vendors.event_id
    and events.property_id = get_user_property_id()
  )
);
create policy "vendors_delete" on event_vendors for delete using (
  is_developer() or exists(
    select 1 from events where events.id = event_vendors.event_id
    and events.property_id = get_user_property_id()
  )
);

-- Event Activations
alter table event_activations enable row level security;
create policy "activations_select" on event_activations for select using (
  is_developer() or exists(
    select 1 from events where events.id = event_activations.event_id
    and events.property_id = get_user_property_id()
  )
);
create policy "activations_insert" on event_activations for insert with check (
  is_developer() or exists(
    select 1 from events where events.id = event_activations.event_id
    and events.property_id = get_user_property_id()
  )
);
create policy "activations_update" on event_activations for update using (
  is_developer() or exists(
    select 1 from events where events.id = event_activations.event_id
    and events.property_id = get_user_property_id()
  )
);
create policy "activations_delete" on event_activations for delete using (
  is_developer() or exists(
    select 1 from events where events.id = event_activations.event_id
    and events.property_id = get_user_property_id()
  )
);

-- Valuations
alter table valuations enable row level security;
create policy "valuations_select" on valuations for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "valuations_insert" on valuations for insert with check (
  is_developer() or property_id = get_user_property_id()
);
create policy "valuations_update" on valuations for update using (
  is_developer() or property_id = get_user_property_id()
);

-- Valuation Training Data
alter table valuation_training_data enable row level security;
create policy "training_select" on valuation_training_data for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "training_insert" on valuation_training_data for insert with check (
  is_developer() or property_id = get_user_property_id()
);

-- Claude Context
alter table claude_context enable row level security;
create policy "context_select" on claude_context for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "context_insert" on claude_context for insert with check (is_developer());
create policy "context_update" on claude_context for update using (is_developer());

-- Daily Intelligence Log
alter table daily_intelligence_log enable row level security;
create policy "intel_select" on daily_intelligence_log for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "intel_insert" on daily_intelligence_log for insert with check (is_developer());

-- Business Metrics
alter table business_metrics enable row level security;
create policy "metrics_select" on business_metrics for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "metrics_insert" on business_metrics for insert with check (
  is_developer() or property_id = get_user_property_id()
);
create policy "metrics_update" on business_metrics for update using (
  is_developer() or property_id = get_user_property_id()
);

-- Data Exports
alter table data_exports enable row level security;
create policy "exports_select" on data_exports for select using (
  is_developer() or property_id = get_user_property_id()
);
create policy "exports_insert" on data_exports for insert with check (
  is_developer() or property_id = get_user_property_id()
);

-- User Events
alter table user_events enable row level security;
create policy "user_events_select" on user_events for select using (
  user_id = auth.uid() or is_developer()
);
create policy "user_events_insert" on user_events for insert with check (
  user_id = auth.uid()
);

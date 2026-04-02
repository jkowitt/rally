-- Asset inventory management: add total_available and sold counts

-- total_available: how many of this asset type exist to sell (set by admin)
-- sold_count: auto-tracked count of how many are committed in contracts
alter table assets add column if not exists total_available integer default 0;
alter table assets add column if not exists sold_count integer default 0;
alter table assets add column if not exists from_contract boolean default false;
alter table assets add column if not exists source_contract_id uuid references contracts(id) on delete set null;

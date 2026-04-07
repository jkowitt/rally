-- Account deletion scheduling and archival
alter table properties add column if not exists scheduled_deletion_at timestamptz;
alter table properties add column if not exists access_until timestamptz;
alter table properties add column if not exists deletion_requested_by uuid references profiles(id);
alter table properties add column if not exists archived_at timestamptz;

-- Index for finding accounts that need deletion
create index if not exists idx_properties_deletion on properties(scheduled_deletion_at) where scheduled_deletion_at is not null;

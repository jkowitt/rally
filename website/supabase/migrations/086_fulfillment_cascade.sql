-- ============================================================
-- MIGRATION 086 — FULFILLMENT_RECORDS CASCADE FIX
-- ============================================================
-- The original schema (migration 001) created fulfillment_records
-- with FKs to contracts and contract_benefits but no ON DELETE
-- clause, so deleting a contract that has fulfillment rows fails
-- with a foreign-key violation. The 080 trg_spawn_fulfillment
-- trigger makes this worse: it inserts fulfillment rows without
-- auto_generated=true, so even the front-end's "delete auto-generated
-- rows first" cleanup misses them.
--
-- Drop the old constraints (without cascades) and re-add them with
-- ON DELETE CASCADE so contract delete (or benefit delete) automatically
-- removes the fulfillment children.
-- ============================================================

-- contract_id ➞ contracts(id)
alter table fulfillment_records
  drop constraint if exists fulfillment_records_contract_id_fkey;
alter table fulfillment_records
  add  constraint fulfillment_records_contract_id_fkey
  foreign key (contract_id) references contracts(id) on delete cascade;

-- benefit_id ➞ contract_benefits(id)
alter table fulfillment_records
  drop constraint if exists fulfillment_records_benefit_id_fkey;
alter table fulfillment_records
  add  constraint fulfillment_records_benefit_id_fkey
  foreign key (benefit_id) references contract_benefits(id) on delete cascade;

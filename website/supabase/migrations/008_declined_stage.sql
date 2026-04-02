-- Add 'Declined' as a valid deal stage
-- Drop and recreate the check constraint to include Declined
alter table deals drop constraint if exists deals_stage_check;
alter table deals add constraint deals_stage_check check (stage in ('Prospect','Proposal Sent','Negotiation','Contracted','In Fulfillment','Renewed','Declined'));

-- Contract PDF storage and Proposal Assets

-- Store the original uploaded PDF file data (base64) directly on the contract
-- This preserves the exact PDF with zero modifications
alter table contracts add column if not exists pdf_file_data text;
alter table contracts add column if not exists pdf_file_name text;
alter table contracts add column if not exists pdf_content_type text default 'application/pdf';
alter table contracts add column if not exists is_template boolean default false;
alter table contracts add column if not exists template_name text;

-- Track which company details are editable in the contract
alter table contracts add column if not exists company_name text;
alter table contracts add column if not exists company_address text;
alter table contracts add column if not exists company_signee text;
alter table contracts add column if not exists company_email text;
alter table contracts add column if not exists notice_address text;
alter table contracts add column if not exists notice_email text;

-- Proposal assets: track which assets are pitched in a proposal/deal
-- Uses existing deal_assets table but adds proposal tracking
alter table deal_assets add column if not exists is_proposed boolean default false;
alter table deal_assets add column if not exists proposed_at timestamptz;
alter table deal_assets add column if not exists proposed_price numeric;
alter table deal_assets add column if not exists notes text;

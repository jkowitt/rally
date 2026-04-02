-- ============================================================
-- CRM ENHANCEMENT: Contact fields + contract AI support
-- ============================================================

-- Add detailed contact fields to deals
alter table deals add column if not exists contact_first_name text;
alter table deals add column if not exists contact_last_name text;
alter table deals add column if not exists contact_phone text;
alter table deals add column if not exists contact_position text;
alter table deals add column if not exists contact_company text;
alter table deals add column if not exists date_added date default current_date;
alter table deals add column if not exists source text check (source in ('Referral','Cold Outreach','Inbound','Event','Renewal','Other'));
alter table deals add column if not exists priority text check (priority in ('High','Medium','Low')) default 'Medium';
alter table deals add column if not exists last_contacted date;
alter table deals add column if not exists next_follow_up date;

-- Add contract AI fields
alter table contracts add column if not exists contract_text text;
alter table contracts add column if not exists ai_summary text;
alter table contracts add column if not exists ai_extracted_benefits jsonb;
alter table contracts add column if not exists original_pdf_url text;
alter table contracts add column if not exists status text check (status in ('Draft','In Review','Final','Signed','Expired')) default 'Draft';

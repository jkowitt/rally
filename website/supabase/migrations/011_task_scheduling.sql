-- ============================================================
-- 011: Task scheduling fields for activity reminders
-- ============================================================

alter table tasks add column if not exists task_type text;
alter table tasks add column if not exists scheduled_time text; -- HH:MM format
alter table tasks add column if not exists reminder_time text;  -- HH:MM format for push notification

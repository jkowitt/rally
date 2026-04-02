-- ============================================================
-- SEED DEVELOPER ACCOUNT: jlkowitt25@gmail.com
-- Run this in the Supabase SQL editor after migrations 001-004
-- ============================================================

-- Create the auth user (the trigger from 004 auto-creates the developer profile)
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'jlkowitt25@gmail.com',
  crypt('Gettingloud2026!', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Jason Kowitt"}',
  now(),
  now(),
  '',
  ''
);

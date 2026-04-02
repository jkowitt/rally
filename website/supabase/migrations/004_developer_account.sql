-- ============================================================
-- AUTO-PROMOTE DEVELOPER ACCOUNT
-- ============================================================

-- Trigger function: auto-set role to 'developer' for specific emails
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when new.email in ('jlkowitt25@gmail.com') then 'developer'
      else 'rep'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

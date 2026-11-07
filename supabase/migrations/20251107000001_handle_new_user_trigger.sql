-- GKK schema reconstruction, part 2: seed profiles and chef_profiles on signup.
--
-- The app reads a profiles row immediately after signup. app/index.tsx:34-36
-- selects user_type from profiles by the auth user id; if that row is missing it
-- redirects the signed-in user to /auth/login, and app/_layout.tsx then bounces a
-- signed-in user out of the auth group, which is a redirect loop. This trigger
-- creates the profiles row as soon as Supabase creates the auth user, copying the
-- values the signup form put in auth metadata (app/auth/signup.tsx:46-51):
-- full_name, phone_number, and user_type.
--
-- Chef onboarding only ever issues an UPDATE against chef_profiles
-- (components/chef/ChefOnboarding.tsx:120-133), never an INSERT. For that update
-- to land on a row, this trigger also seeds an empty chef_profiles row for users
-- whose signup metadata says chef. The seeded row starts inactive and not
-- accepting orders, so it stays out of the customer browse feed until onboarding
-- sets is_active and is_accepting_orders to true.
--
-- The function is security definer and owned by the role that runs the migration
-- (postgres in the Supabase SQL editor), so it can insert into profiles even after
-- Row Level Security is enabled in part 3.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_type text := case
    lower(coalesce(new.raw_user_meta_data->>'user_type', 'customer'))
    when 'chef' then 'chef'
    else 'customer'
  end;
begin
  insert into public.profiles (id, full_name, phone_number, user_type)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone_number',
    v_user_type
  )
  on conflict (id) do nothing;

  if v_user_type = 'chef' then
    insert into public.chef_profiles (id)
    values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

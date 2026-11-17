-- UCL production authentication/authorization foundation.
-- Apply in Supabase Postgres; not wired to the GitHub Pages prototype.
-- Assumes Supabase-owned auth.users and auth.uid() exist.
-- Never store passwords, recovery tokens, or admin roles in public.profiles.

create schema if not exists app_private;
revoke all on schema app_private from public;
revoke all on schema app_private from anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New Player'
    check (char_length(trim(display_name)) between 2 and 80),
  username text unique
    check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
  city text check (city is null or char_length(city) <= 100),
  state text check (state is null or char_length(state) <= 100),
  avatar_url text check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://')),
  discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_name_idx on public.profiles (lower(display_name));

create table if not exists app_private.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  disabled_at timestamptz
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  created_by uuid not null references public.profiles(id),
  public_listing boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','director','scorekeeper')),
  status text not null default 'active'
    check (status in ('invited','active','suspended')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  primary key (organization_id,user_id)
);
create index if not exists organization_memberships_user_idx
  on public.organization_memberships (user_id, status);

create table if not exists app_private.authorization_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  action text not null check (char_length(action) between 3 and 120),
  target_user_id uuid references auth.users(id),
  organization_id uuid references public.organizations(id),
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table app_private.platform_admins enable row level security;
alter table app_private.authorization_audit enable row level security;

-- Explicit, minimum privilege access even when Supabase project defaults evolve.
revoke all on public.profiles, public.organizations, public.organization_memberships
  from anon, authenticated;
revoke all on app_private.platform_admins, app_private.authorization_audit
  from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update (display_name, username, city, state, avatar_url, discoverable)
  on public.profiles to authenticated;
grant select on public.organizations, public.organization_memberships to authenticated;

-- Only a trusted server with service_role can provision organization or admin grants.
grant select, insert, update, delete on public.profiles, public.organizations,
  public.organization_memberships to service_role;
grant usage on schema app_private to service_role;
grant select, insert, update, delete on app_private.platform_admins to service_role;
-- The API may append to the audit ledger, but not edit prior audit rows.
grant select, insert on app_private.authorization_audit to service_role;
grant usage, select on all sequences in schema app_private to service_role;

-- These policies are not an "admin" flag that users can manipulate.
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(exists (
    select 1 from app_private.platform_admins a
     where a.user_id = (select auth.uid()) and a.disabled_at is null
  ), false)
$$;
revoke all on function public.is_platform_admin() from public, anon, authenticated;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(exists (
    select 1 from public.organization_memberships m
     where m.organization_id = p_organization_id
       and m.user_id = (select auth.uid())
       and m.status = 'active'
  ), false)
$$;
revoke all on function public.is_org_member(uuid) from public, anon, authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

create or replace function public.is_org_manager(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(exists (
    select 1 from public.organization_memberships m
     where m.organization_id = p_organization_id
       and m.user_id = (select auth.uid())
       and m.role in ('owner','director')
       and m.status = 'active'
  ), false)
$$;
revoke all on function public.is_org_manager(uuid) from public, anon, authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;

-- Supabase Auth owns credentials; this merely creates a corresponding public profile.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  candidate text;
begin
  candidate := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80);
  insert into public.profiles (id, display_name)
    values (new.id, case when char_length(candidate) >= 2 then candidate else 'New Player' end)
    on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_ucl_auth_user_created on auth.users;
create trigger on_ucl_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.touch_profile_updated_at()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.touch_profile_updated_at() from public, anon, authenticated;

drop trigger if exists on_ucl_profile_updated on public.profiles;
create trigger on_ucl_profile_updated
  before update on public.profiles for each row execute function public.touch_profile_updated_at();

-- Trusted organization creation automatically gives its creator the owner membership.
create or replace function public.create_organization_owner_membership()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.organization_memberships
    (organization_id, user_id, role, status, granted_by)
    values (new.id, new.created_by, 'owner', 'active', new.created_by);
  return new;
end;
$$;
revoke all on function public.create_organization_owner_membership() from public, anon, authenticated;

drop trigger if exists on_ucl_organization_created on public.organizations;
create trigger on_ucl_organization_created
  after insert on public.organizations for each row
  execute function public.create_organization_owner_membership();

-- Public player directory: only opted-in/discoverable profiles.
create policy "public_profiles_discoverable" on public.profiles
  for select to anon using (discoverable);
create policy "authenticated_profiles_visible" on public.profiles
  for select to authenticated
  using (discoverable or id = (select auth.uid()) or (select public.is_platform_admin()));
create policy "users_update_only_own_profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Organization rosters and director permissions are private by default.
create policy "organizations_read_own_or_listed" on public.organizations
  for select to authenticated
  using (public_listing or (select public.is_platform_admin()) or public.is_org_member(id));
create policy "memberships_read_own_or_managed" on public.organization_memberships
  for select to authenticated
  using (user_id = (select auth.uid())
    or (select public.is_platform_admin())
    or public.is_org_manager(organization_id));
-- No client-side INSERT/UPDATE/DELETE policies on memberships, organizations or admins.

create or replace function public.get_my_access()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', (select auth.uid()),
    'platform_admin', (select public.is_platform_admin()),
    'organizations', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'organization_id', m.organization_id,
        'role', m.role,
        'status', m.status
      ))
      from public.organization_memberships m
      where m.user_id = (select auth.uid()) and m.status = 'active'),
      '[]'::jsonb)
  )
$$;
revoke all on function public.get_my_access() from public, anon, authenticated;
grant execute on function public.get_my_access() to authenticated;

-- Backfill profiles if project already had authenticated accounts.
insert into public.profiles (id, display_name)
select u.id,
       case when char_length(trim(coalesce(u.raw_user_meta_data ->> 'display_name', ''))) >= 2
            then left(trim(u.raw_user_meta_data ->> 'display_name'),80)
            else 'New Player' end
  from auth.users u
on conflict (id) do nothing;

-- BOOTSTRAP ADMIN: after an actual verified Supabase user signs in, an operator must
-- insert that specific UUID into app_private.platform_admins via a trusted SQL session.
-- NEVER promote users by email, signup metadata, or public client code.

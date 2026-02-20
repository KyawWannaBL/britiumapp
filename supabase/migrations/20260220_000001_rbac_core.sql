-- RBAC core schema for Britium Enterprise
-- Designed for Supabase Postgres + RLS.
-- Conventions:
--  - role codes and permission codes match packages/shared
--  - permissions checked via app.has_permission(code)
--  - scope is stored on profile; per-table policies may additionally check branch_id/region_id

create schema if not exists app;

-- Roles
create table if not exists app.roles (
  code text primary key,
  level int not null check (level between 0 and 5),
  name text not null,
  created_at timestamptz not null default now()
);

-- Permissions catalog
create table if not exists app.permissions (
  code text primary key,
  domain text not null,
  resource text not null,
  action text not null,
  scope text null,
  module text null,
  created_at timestamptz not null default now()
);

-- Role to permission mapping
create table if not exists app.role_permissions (
  role_code text not null references app.roles(code) on delete cascade,
  permission_code text not null references app.permissions(code) on delete cascade,
  primary key (role_code, permission_code)
);

-- User profile (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role_code text not null references app.roles(code),
  must_change_password boolean not null default true,
  scope_default text not null default 'S3_BRANCH',
  branch_id uuid,
  region_id uuid,
  company_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Helper: current role
create or replace function app.current_role_code()
returns text language sql stable as $$
  select role_code from public.profiles where id = auth.uid();
$$;

-- Helper: check permission existence
create or replace function app.has_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from public.profiles p
    join app.role_permissions rp on rp.role_code = p.role_code
    where p.id = auth.uid()
      and rp.permission_code = p_code
  );
$$;

-- Helper: APP_OWNER check
create or replace function app.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select (app.current_role_code() = 'APP_OWNER');
$$;

-- Seed baseline roles (idempotent)
insert into app.roles(code, level, name) values
  ('APP_OWNER', 5, 'Owner'),
  ('SUPER_ADMIN', 4, 'Enterprise Admin'),
  ('OPERATIONS_ADMIN', 3, 'Operations Admin'),
  ('FINANCE_STAFF', 3, 'Finance Staff'),
  ('HR_ADMIN', 3, 'HR Admin'),
  ('MARKETING_ADMIN', 3, 'Marketing Admin'),
  ('SUPERVISOR', 2, 'Supervisor'),
  ('WAREHOUSE_MANAGER', 2, 'Warehouse Manager'),
  ('SUBSTATION_MANAGER', 2, 'Substation Manager'),
  ('RIDER', 1, 'Rider'),
  ('DRIVER', 1, 'Driver'),
  ('HELPER', 1, 'Helper'),
  ('DATA_ENTRY', 1, 'Data Entry'),
  ('CUSTOMER_SERVICE', 1, 'Customer Service'),
  ('STAFF', 1, 'Staff'),
  ('MERCHANT', 0, 'Merchant'),
  ('CUSTOMER', 0, 'Customer')
on conflict (code) do update set level = excluded.level, name = excluded.name;

-- RLS: profiles
alter table public.profiles enable row level security;

-- Users can view/update their own profile
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Admins can view/update any profile (but NOT RBAC definitions unless APP_OWNER)
drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select
on public.profiles for select
to authenticated
using (app.has_permission('ADM:USERS:VIEW:S5_COMPANY'));

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles for update
to authenticated
using (app.has_permission('ADM:USERS:UPDATE:S5_COMPANY'))
with check (true);

-- RBAC tables RLS (Control Room exclusive)
alter table app.roles enable row level security;
alter table app.permissions enable row level security;
alter table app.role_permissions enable row level security;

-- View RBAC: APP_OWNER only
drop policy if exists rbac_view_owner_roles on app.roles;
create policy rbac_view_owner_roles
on app.roles for select
to authenticated
using (app.has_permission('CTRL:RBAC:VIEW:S5_COMPANY'));

drop policy if exists rbac_view_owner_perms on app.permissions;
create policy rbac_view_owner_perms
on app.permissions for select
to authenticated
using (app.has_permission('CTRL:RBAC:VIEW:S5_COMPANY'));

drop policy if exists rbac_view_owner_role_perms on app.role_permissions;
create policy rbac_view_owner_role_perms
on app.role_permissions for select
to authenticated
using (app.has_permission('CTRL:RBAC:VIEW:S5_COMPANY'));

-- Modify RBAC: APP_OWNER only
drop policy if exists rbac_write_owner_roles on app.roles;
create policy rbac_write_owner_roles
on app.roles for all
to authenticated
using (app.has_permission('CTRL:RBAC:WRITE:S5_COMPANY'))
with check (app.has_permission('CTRL:RBAC:WRITE:S5_COMPANY'));

drop policy if exists rbac_write_owner_perms on app.permissions;
create policy rbac_write_owner_perms
on app.permissions for all
to authenticated
using (app.has_permission('CTRL:PERMISSIONS:CATALOG:WRITE:S5_COMPANY'))
with check (app.has_permission('CTRL:PERMISSIONS:CATALOG:WRITE:S5_COMPANY'));

drop policy if exists rbac_write_owner_role_perms on app.role_permissions;
create policy rbac_write_owner_role_perms
on app.role_permissions for all
to authenticated
using (app.has_permission('CTRL:RBAC:WRITE:S5_COMPANY'))
with check (app.has_permission('CTRL:RBAC:WRITE:S5_COMPANY'));

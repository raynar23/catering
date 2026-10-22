-- Migration: 017_security_advisor_hardening
-- Strict database hardening for profiles, order_logs append-only, and role escalation prevention

-- 1. PROFILES ISOLATION & ESCALATION GUARD
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin_ga'
      and aktif = true
  );
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function public.my_vendor_id()
returns uuid as $$
  select vendor_id from public.profiles
  where id = auth.uid()
    and role = 'vendor'
    and aktif = true;
$$ language sql stable security definer set search_path = public, pg_temp;

-- Reset and enforce profiles select policy (vendors only see their own profile, admin sees all)
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_manage_policy" on public.profiles;

create policy "profiles_select_policy" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Reset and enforce profiles update policy
drop policy if exists "profiles_update_policy" on public.profiles;
create policy "profiles_update_policy" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    -- Non-admin cannot alter role, vendor_id, or active status
    public.is_admin() or (
      role = (select p.role from public.profiles p where p.id = auth.uid())
      and coalesce(vendor_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce((select p.vendor_id from public.profiles p where p.id = auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
      and aktif = (select p.aktif from public.profiles p where p.id = auth.uid())
    )
  );

-- Revoke blanket table update and grant only to safe self-service column nama
revoke update on public.profiles from authenticated, anon;
grant update (nama) on public.profiles to authenticated;

-- Trigger guard: prevent unauthorized changes to sensitive profile columns
create or replace function public.guard_profiles_update()
returns trigger as $$
begin
  if current_user in ('postgres', 'service_role') or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role or
     new.vendor_id is distinct from old.vendor_id or
     new.aktif is distinct from old.aktif or
     new.bagian_id is distinct from old.bagian_id or
     new.id is distinct from old.id or
     new.username is distinct from old.username then
    raise exception 'Modifikasi kolom terlindungi pada profiles tidak diizinkan';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_guard_profiles_update on public.profiles;
create trigger trg_guard_profiles_update
  before update on public.profiles
  for each row
  execute function public.guard_profiles_update();

-- 2. ORDER LOGS APPEND-ONLY AUDIT HARDENING
-- Block any update or delete operations on audit logs even for authenticated users
drop policy if exists "order_logs_no_update" on public.order_logs;
create policy "order_logs_no_update" on public.order_logs
  for update to authenticated
  using (false);

drop policy if exists "order_logs_no_delete" on public.order_logs;
create policy "order_logs_no_delete" on public.order_logs
  for delete to authenticated
  using (false);

revoke insert, update, delete on public.order_logs from authenticated, anon;

-- Revoke direct mutations on operational transaction tables (mutations only via security definer RPCs)
revoke insert, update, delete on public.catering_orders from authenticated, anon;
revoke insert, update, delete on public.catering_items from authenticated, anon;
revoke insert, update, delete on public.revisions from authenticated, anon;
revoke insert, update, delete on public.import_batches from authenticated, anon;

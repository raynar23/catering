-- Row Level Security policies and vendor isolation

-- Helper security functions
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin_ga'
      and aktif = true
  );
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.my_vendor_id()
returns uuid as $$
  select vendor_id from public.profiles
  where id = auth.uid()
    and role = 'vendor'
    and aktif = true;
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function public.my_vendor_id() from public;
grant execute on function public.my_vendor_id() to authenticated;

create or replace function public.is_admin_or_pic()
returns boolean as $$
  select public.is_admin();
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function public.is_admin_or_pic() from public;
grant execute on function public.is_admin_or_pic() to authenticated;

create or replace function current_user_role()
returns app_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function current_user_vendor_id()
returns uuid as $$
  select public.my_vendor_id();
$$ language sql stable security definer set search_path = public, pg_temp;

-- Enable RLS on all operational and master tables
alter table profiles enable row level security;
alter table shifts enable row level security;
alter table bagian enable row level security;
alter table vendors enable row level security;
alter table periods enable row level security;
alter table catering_orders enable row level security;
alter table catering_items enable row level security;
alter table revisions enable row level security;
alter table order_logs enable row level security;
alter table import_batches enable row level security;

-- PROFILES
create policy "profiles_select_policy" on profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_policy" on profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Revoke blanket table update and grant only to safe self-service column nama
revoke update on public.profiles from authenticated, anon;
grant update (nama) on public.profiles to authenticated;

-- Trigger guard: prevent unauthorized changes to sensitive profile columns
create or replace function public.guard_profiles_update()
returns trigger as $$
begin
  -- Allow service_role or superuser to update any column
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

-- SHIFTS
create policy "shifts_select_policy" on shifts
  for select to authenticated
  using (true);

create policy "shifts_manage_policy" on shifts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- BAGIAN
create policy "bagian_select_policy" on bagian
  for select to authenticated
  using (true);

create policy "bagian_manage_policy" on bagian
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- VENDORS (Vendor Isolation)
create policy "vendors_select_policy" on vendors
  for select to authenticated
  using (public.is_admin() or id = public.my_vendor_id());

create policy "vendors_manage_policy" on vendors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- PERIODS (Vendor Isolation: Vendor only sees assigned periods)
create policy "periods_select_policy" on periods
  for select to authenticated
  using (public.is_admin() or vendor_id = public.my_vendor_id());

create policy "periods_manage_policy" on periods
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- CATERING ORDERS (Vendors only see their own orders with status Final or Revisi)
create policy "orders_select_policy" on catering_orders
  for select to authenticated
  using (
    public.is_admin()
    or (vendor_id = public.my_vendor_id() and status in ('final', 'revisi'))
  );

-- CATERING ITEMS (Vendors only see items from their own Final or Revisi orders)
create policy "items_select_policy" on catering_items
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from catering_orders o
      where o.id = catering_items.order_id
        and o.vendor_id = public.my_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- REVISIONS (Vendors only see revisions for their own items)
create policy "revisions_select_policy" on revisions
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from catering_items ci
      join catering_orders o on o.id = ci.order_id
      where ci.id = revisions.item_id
        and o.vendor_id = public.my_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- ORDER LOGS (Vendors only see logs for their own orders)
create policy "order_logs_select_policy" on order_logs
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from catering_orders o
      where o.id = order_logs.order_id
        and o.vendor_id = public.my_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- IMPORT BATCHES (GA only)
create policy "import_batches_policy" on import_batches
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Revoke all table and routine permissions from anon on public schema
revoke all on all tables in schema public from anon;
revoke all on all routines in schema public from anon;

-- Revoke direct writes from authenticated on operational tables (mutations only via security definer RPCs)
revoke insert, update, delete on public.catering_orders from authenticated;
revoke insert, update, delete on public.catering_items from authenticated;
revoke insert, update, delete on public.revisions from authenticated;
revoke insert, update, delete on public.order_logs from authenticated;
revoke insert, update, delete on public.import_batches from authenticated;

-- Ensure select access on tables for authenticated users according to RLS
grant select on public.catering_orders to authenticated;
grant select on public.catering_items to authenticated;
grant select on public.revisions to authenticated;
grant select on public.order_logs to authenticated;
grant select on public.import_batches to authenticated;
grant select on public.shifts to authenticated;
grant select on public.bagian to authenticated;
grant select on public.vendors to authenticated;
grant select on public.periods to authenticated;

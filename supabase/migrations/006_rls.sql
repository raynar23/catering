-- Row Level Security policies and vendor isolation

-- Helper security functions
create or replace function current_user_role()
returns app_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function current_user_vendor_id()
returns uuid as $$
  select vendor_id from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function is_admin_or_pic()
returns boolean as $$
  select coalesce(
    (select role = 'admin_ga' from profiles where id = auth.uid()),
    false
  );
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
  using (true);

create policy "profiles_update_policy" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- SHIFTS
create policy "shifts_select_policy" on shifts
  for select to authenticated
  using (true);

create policy "shifts_manage_policy" on shifts
  for all to authenticated
  using (coalesce((select role = 'admin_ga' from profiles where id = auth.uid()), false))
  with check (coalesce((select role = 'admin_ga' from profiles where id = auth.uid()), false));

-- BAGIAN
create policy "bagian_select_policy" on bagian
  for select to authenticated
  using (true);

create policy "bagian_manage_policy" on bagian
  for all to authenticated
  using (coalesce((select role = 'admin_ga' from profiles where id = auth.uid()), false))
  with check (coalesce((select role = 'admin_ga' from profiles where id = auth.uid()), false));

-- VENDORS (Vendor Isolation)
create policy "vendors_select_policy" on vendors
  for select to authenticated
  using (is_admin_or_pic() or id = current_user_vendor_id());

create policy "vendors_manage_policy" on vendors
  for all to authenticated
  using (coalesce((select role = 'admin_ga' from profiles where id = auth.uid()), false))
  with check (coalesce((select role = 'admin_ga' from profiles where id = auth.uid()), false));

-- PERIODS (Vendor Isolation: Vendor only sees assigned periods)
create policy "periods_select_policy" on periods
  for select to authenticated
  using (is_admin_or_pic() or vendor_id = current_user_vendor_id());

create policy "periods_manage_policy" on periods
  for all to authenticated
  using (coalesce((select role = 'admin_ga' from profiles where id = auth.uid()), false))
  with check (coalesce((select role = 'admin_ga' from profiles where id = auth.uid()), false));

-- CATERING ORDERS (Vendors only see their own orders with status Final or Revisi)
create policy "orders_select_policy" on catering_orders
  for select to authenticated
  using (
    is_admin_or_pic()
    or (vendor_id = current_user_vendor_id() and status in ('final', 'revisi'))
  );
-- NOTE: No insert/update/delete policies for client; changes occur strictly through security definer RPCs.

-- CATERING ITEMS (Vendors only see items from their own Final or Revisi orders)
create policy "items_select_policy" on catering_items
  for select to authenticated
  using (
    is_admin_or_pic()
    or exists (
      select 1 from catering_orders o
      where o.id = catering_items.order_id
        and o.vendor_id = current_user_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- REVISIONS (Vendors only see revisions for their own items)
create policy "revisions_select_policy" on revisions
  for select to authenticated
  using (
    is_admin_or_pic()
    or exists (
      select 1 from catering_items ci
      join catering_orders o on o.id = ci.order_id
      where ci.id = revisions.item_id
        and o.vendor_id = current_user_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- ORDER LOGS (Vendors only see logs for their own orders)
create policy "order_logs_select_policy" on order_logs
  for select to authenticated
  using (
    is_admin_or_pic()
    or exists (
      select 1 from catering_orders o
      where o.id = order_logs.order_id
        and o.vendor_id = current_user_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- IMPORT BATCHES (GA only)
create policy "import_batches_policy" on import_batches
  for all to authenticated
  using (is_admin_or_pic())
  with check (is_admin_or_pic());

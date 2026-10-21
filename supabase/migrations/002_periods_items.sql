-- 002_periods_items.sql
-- Migration 002: Periods, Catering Orders, and Catering Items

-- Periods (Date + Shift + Assigned Vendor)
create table periods (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  shift_id uuid not null references shifts(id) on delete restrict,
  vendor_id uuid not null references vendors(id) on delete restrict,
  keterangan text,
  created_at timestamptz not null default now(),
  unique (tanggal, shift_id)
);

-- Catering Orders for each Period
create table catering_orders (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null unique references periods(id) on delete restrict,
  vendor_id uuid not null references vendors(id) on delete restrict,
  status order_status not null default 'draft',
  created_by uuid not null references profiles(id),
  submitted_by uuid references profiles(id),
  submitted_at timestamptz,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  catatan text,
  respon_vendor vendor_response_status not null default 'menunggu',
  respon_vendor_at timestamptz,
  catatan_vendor text,
  progres_vendor vendor_progress not null default 'menunggu',
  progres_vendor_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Catering Items per Bagian
create table catering_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references catering_orders(id) on delete cascade,
  bagian_id uuid not null references bagian(id) on delete restrict,
  jumlah_karyawan integer not null check (jumlah_karyawan >= 0),
  jumlah_porsi integer not null check (jumlah_porsi >= 0),
  keterangan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, bagian_id)
);

-- Indexes
create index idx_periods_tanggal on periods (tanggal);
create index idx_periods_shift on periods (shift_id);
create index idx_periods_vendor on periods (vendor_id);
create index idx_orders_period on catering_orders (period_id);
create index idx_orders_vendor on catering_orders (vendor_id);
create index idx_orders_status on catering_orders (status);
create index idx_orders_vendor_status on catering_orders (vendor_id, status);
create index idx_items_order on catering_items (order_id);
create index idx_items_bagian on catering_items (bagian_id);

-- Revisions, append-only order logs, and integrity triggers
create table revisions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references catering_items(id) on delete cascade,
  karyawan_awal integer not null,
  karyawan_baru integer not null check (karyawan_baru >= 0),
  porsi_awal integer not null,
  porsi_baru integer not null check (porsi_baru >= 0),
  selisih_porsi integer generated always as (porsi_baru - porsi_awal) stored,
  alasan text not null check (length(trim(alasan)) > 0),
  status revision_status not null default 'menunggu',
  diajukan_oleh uuid not null references profiles(id),
  diajukan_at timestamptz not null default now(),
  diverifikasi_oleh uuid references profiles(id),
  diverifikasi_at timestamptz,
  catatan_verifikator text,
  respon_vendor vendor_response_status not null default 'menunggu',
  respon_vendor_at timestamptz,
  catatan_vendor text,
  created_at timestamptz not null default now()
);

-- Timeline / Audit Logs (Append-Only)
create table order_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references catering_orders(id) on delete cascade,
  item_id uuid references catering_items(id) on delete set null,
  revision_id uuid references revisions(id) on delete set null,
  aksi log_action not null,
  jumlah_awal integer,
  selisih integer,
  jumlah_baru integer,
  keterangan text,
  oleh uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Unique index: At most one pending revision per catering item
create unique index idx_revisions_one_menunggu on revisions (item_id) where (status = 'menunggu');

-- Indexes
create index idx_revisions_item on revisions (item_id);
create index idx_revisions_status on revisions (status);
create index idx_order_logs_order on order_logs (order_id);
create index idx_order_logs_created on order_logs (created_at desc);

-- Trigger: Revisions immutable core columns
create or replace function check_revision_immutable()
returns trigger as $$
begin
  if old.item_id <> new.item_id
     or old.karyawan_awal <> new.karyawan_awal
     or old.karyawan_baru <> new.karyawan_baru
     or old.porsi_awal <> new.porsi_awal
     or old.porsi_baru <> new.porsi_baru
     or old.alasan <> new.alasan
     or old.diajukan_oleh <> new.diajukan_oleh
     or old.diajukan_at <> new.diajukan_at
  then
    raise exception 'Kolom inti revisi bersifat tetap dan tidak boleh diubah.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_revision_immutable
before update on revisions
for each row execute function check_revision_immutable();

create or replace function prevent_revision_delete()
returns trigger as $$
begin
  raise exception 'Data revisi tidak boleh dihapus.';
end;
$$ language plpgsql;

create trigger trg_prevent_revision_delete
before delete on revisions
for each row execute function prevent_revision_delete();

-- Trigger: Order logs strictly append-only
create or replace function prevent_order_logs_mod()
returns trigger as $$
begin
  raise exception 'Riwayat order_logs bersifat append-only dan tidak boleh diubah atau dihapus.';
end;
$$ language plpgsql;

create trigger trg_prevent_order_logs_mod
before update or delete on order_logs
for each row execute function prevent_order_logs_mod();

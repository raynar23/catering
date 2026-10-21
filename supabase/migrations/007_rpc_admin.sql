-- 007_rpc_admin.sql
-- Migration 007: Administrative RPC Functions (Security Definer with Strict Search Path)

-- 1. simpan_catering (Simpan Draft Pesanan)
create or replace function simpan_catering(
  p_period_id uuid,
  p_items jsonb,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_period record;
  v_order_id uuid;
  v_item jsonb;
  v_bagian_id uuid;
  v_karyawan integer;
  v_porsi integer;
  v_ket text;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role not in ('admin_ga', 'pic_unit', 'supervisor_ga') then
    raise exception 'Akses ditolak: hanya General Affairs yang dapat menginput data catering.';
  end if;

  select * into v_period from periods where id = p_period_id;
  if not found then
    raise exception 'Periode catering tidak ditemukan.';
  end if;

  select id, status into v_order_id from catering_orders where period_id = p_period_id;
  if found and v_order_id is not null then
    if (select status from catering_orders where id = v_order_id) not in ('draft') then
      raise exception 'Pesanan sudah berstatus % dan tidak dapat diubah langsung. Gunakan alur revisi.', (select status from catering_orders where id = v_order_id);
    end if;
    update catering_orders
    set catatan = coalesce(p_catatan, catatan),
        updated_at = now()
    where id = v_order_id;
  else
    insert into catering_orders (
      period_id,
      vendor_id,
      status,
      created_by,
      catatan
    ) values (
      p_period_id,
      v_period.vendor_id,
      'draft',
      auth.uid(),
      p_catatan
    ) returning id into v_order_id;

    insert into order_logs (order_id, aksi, keterangan, oleh)
    values (v_order_id, 'input_awal', 'Membuat draft kebutuhan catering', auth.uid());
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_bagian_id := (v_item->>'bagian_id')::uuid;
    v_karyawan := coalesce((v_item->>'jumlah_karyawan')::integer, 0);
    v_porsi := coalesce((v_item->>'jumlah_porsi')::integer, v_karyawan);
    v_ket := v_item->>'keterangan';

    insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi, keterangan)
    values (v_order_id, v_bagian_id, v_karyawan, v_porsi, v_ket)
    on conflict (order_id, bagian_id)
    do update set
      jumlah_karyawan = excluded.jumlah_karyawan,
      jumlah_porsi = excluded.jumlah_porsi,
      keterangan = excluded.keterangan,
      updated_at = now();
  end loop;

  return v_order_id;
end;
$$;

-- 2. kirim_catering (Kirim ke Vendor / Finalisasi)
create or replace function kirim_catering(
  p_order_id uuid,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_order record;
  v_total_aktif integer;
  v_total_terisi integer;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role not in ('admin_ga', 'supervisor_ga') then
    raise exception 'Akses ditolak: hanya Admin GA yang dapat mengirim pesanan ke vendor.';
  end if;

  select * into v_order from catering_orders where id = p_order_id;
  if not found then
    raise exception 'Pesanan catering tidak ditemukan.';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'Pesanan sudah berstatus % dan tidak dapat dikirim ulang.', v_order.status;
  end if;

  select count(*) into v_total_aktif from bagian where aktif = true;
  select count(distinct ci.bagian_id) into v_total_terisi
  from catering_items ci
  join bagian b on b.id = ci.bagian_id
  where ci.order_id = p_order_id
    and b.aktif = true
    and ci.jumlah_porsi > 0;

  if v_total_terisi < v_total_aktif then
    raise exception 'Pengiriman ditolak: seluruh bagian aktif wajib diisi jumlah porsinya sebelum dikirim ke vendor.';
  end if;

  update catering_orders
  set status = 'final',
      submitted_by = auth.uid(),
      submitted_at = now(),
      respon_vendor = 'menunggu',
      progres_vendor = 'menunggu',
      catatan = coalesce(p_catatan, catatan),
      updated_at = now()
  where id = p_order_id;

  insert into order_logs (order_id, aksi, keterangan, oleh)
  values (p_order_id, 'kirim_ke_vendor', coalesce(p_catatan, 'Pesanan difinalisasi dan dikirim ke vendor'), auth.uid());

  return p_order_id;
end;
$$;

-- 3. ajukan_revisi (Ajukan Perubahan Angka Pesanan Final)
create or replace function ajukan_revisi(
  p_item_id uuid,
  p_karyawan_baru integer,
  p_porsi_baru integer,
  p_alasan text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_item record;
  v_order record;
  v_revision_id uuid;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role not in ('admin_ga', 'pic_unit', 'supervisor_ga') then
    raise exception 'Akses ditolak: role Anda tidak memiliki izin mengajukan revisi.';
  end if;

  if p_alasan is null or length(trim(p_alasan)) = 0 then
    raise exception 'Alasan revisi wajib diisi.';
  end if;

  if p_karyawan_baru < 0 or p_porsi_baru < 0 then
    raise exception 'Jumlah karyawan dan porsi baru tidak boleh negatif.';
  end if;

  select ci.*, o.status as order_status, o.id as order_id
  into v_item
  from catering_items ci
  join catering_orders o on o.id = ci.order_id
  where ci.id = p_item_id;

  if not found then
    raise exception 'Data item catering tidak ditemukan.';
  end if;

  if v_item.order_status not in ('final', 'revisi') then
    raise exception 'Revisi hanya dapat diajukan pada pesanan yang sudah Final.';
  end if;

  if exists (select 1 from revisions where item_id = p_item_id and status = 'menunggu') then
    raise exception 'Masih ada pengajuan revisi yang menunggu verifikasi untuk bagian ini.';
  end if;

  if p_karyawan_baru = v_item.jumlah_karyawan and p_porsi_baru = v_item.jumlah_porsi then
    raise exception 'Jumlah karyawan atau porsi revisi harus berbeda dari data saat ini.';
  end if;

  insert into revisions (
    item_id,
    karyawan_awal,
    karyawan_baru,
    porsi_awal,
    porsi_baru,
    alasan,
    status,
    diajukan_oleh,
    diajukan_at
  ) values (
    p_item_id,
    v_item.jumlah_karyawan,
    p_karyawan_baru,
    v_item.jumlah_porsi,
    p_porsi_baru,
    p_alasan,
    'menunggu',
    auth.uid(),
    now()
  ) returning id into v_revision_id;

  update catering_orders
  set status = 'revisi',
      updated_at = now()
  where id = v_item.order_id;

  insert into order_logs (
    order_id,
    item_id,
    revision_id,
    aksi,
    jumlah_awal,
    selisih,
    jumlah_baru,
    keterangan,
    oleh
  ) values (
    v_item.order_id,
    p_item_id,
    v_revision_id,
    'revisi_diajukan',
    v_item.jumlah_porsi,
    (p_porsi_baru - v_item.jumlah_porsi),
    p_porsi_baru,
    p_alasan,
    auth.uid()
  );

  return v_revision_id;
end;
$$;

-- 4. verifikasi_revisi (Setujui atau Tolak Revisi)
create or replace function verifikasi_revisi(
  p_revision_id uuid,
  p_setuju boolean,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_rev record;
  v_order_id uuid;
  v_remaining_menunggu integer;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role not in ('admin_ga', 'supervisor_ga') then
    raise exception 'Akses ditolak: hanya verifikator yang berhak menyetujui atau menolak revisi.';
  end if;

  select r.*, ci.order_id
  into v_rev
  from revisions r
  join catering_items ci on ci.id = r.item_id
  where r.id = p_revision_id;

  if not found then
    raise exception 'Data pengajuan revisi tidak ditemukan.';
  end if;

  if v_rev.status <> 'menunggu' then
    raise exception 'Pengajuan revisi sudah diproses sebelumnya dengan status %.', v_rev.status;
  end if;

  if v_rev.diajukan_oleh = auth.uid() then
    raise exception 'Integritas data: Pengaju tidak diperbolehkan memverifikasi revisinya sendiri.';
  end if;

  v_order_id := v_rev.order_id;

  if p_setuju then
    update catering_items
    set jumlah_karyawan = v_rev.karyawan_baru,
        jumlah_porsi = v_rev.porsi_baru,
        updated_at = now()
    where id = v_rev.item_id;

    update revisions
    set status = 'disetujui',
        diverifikasi_oleh = auth.uid(),
        diverifikasi_at = now(),
        catatan_verifikator = p_catatan
    where id = p_revision_id;

    insert into order_logs (
      order_id,
      item_id,
      revision_id,
      aksi,
      jumlah_awal,
      selisih,
      jumlah_baru,
      keterangan,
      oleh
    ) values (
      v_order_id,
      v_rev.item_id,
      p_revision_id,
      'revisi_disetujui',
      v_rev.porsi_awal,
      v_rev.selisih_porsi,
      v_rev.porsi_baru,
      coalesce(p_catatan, 'Revisi disetujui'),
      auth.uid()
    );
  else
    if p_catatan is null or length(trim(p_catatan)) = 0 then
      raise exception 'Catatan penolakan wajib diisi saat menolak revisi.';
    end if;

    update revisions
    set status = 'ditolak',
        diverifikasi_oleh = auth.uid(),
        diverifikasi_at = now(),
        catatan_verifikator = p_catatan
    where id = p_revision_id;

    insert into order_logs (
      order_id,
      item_id,
      revision_id,
      aksi,
      jumlah_awal,
      selisih,
      jumlah_baru,
      keterangan,
      oleh
    ) values (
      v_order_id,
      v_rev.item_id,
      p_revision_id,
      'revisi_ditolak',
      v_rev.porsi_awal,
      0,
      v_rev.porsi_awal,
      p_catatan,
      auth.uid()
    );
  end if;

  select count(*) into v_remaining_menunggu
  from revisions r
  join catering_items ci on ci.id = r.item_id
  where ci.order_id = v_order_id and r.status = 'menunggu';

  if v_remaining_menunggu = 0 then
    update catering_orders
    set status = 'final',
        updated_at = now()
    where id = v_order_id;
  end if;

  return p_revision_id;
end;
$$;

-- 5. ganti_vendor_periode (Ganti Vendor pada Periode)
create or replace function ganti_vendor_periode(
  p_period_id uuid,
  p_vendor_baru_id uuid,
  p_alasan text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_order_id uuid;
  v_vendor_lama_nama text;
  v_vendor_baru_nama text;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin_ga' then
    raise exception 'Akses ditolak: hanya Admin GA yang dapat mengganti vendor periode.';
  end if;

  if p_alasan is null or length(trim(p_alasan)) = 0 then
    raise exception 'Alasan penggantian vendor wajib diisi.';
  end if;

  if not exists (select 1 from vendors where id = p_vendor_baru_id and aktif = true) then
    raise exception 'Vendor baru tidak ditemukan atau sedang dinonaktifkan.';
  end if;

  select v.nama into v_vendor_lama_nama
  from periods p
  join vendors v on v.id = p.vendor_id
  where p.id = p_period_id;

  select nama into v_vendor_baru_nama from vendors where id = p_vendor_baru_id;

  update periods
  set vendor_id = p_vendor_baru_id
  where id = p_period_id;

  select id into v_order_id from catering_orders where period_id = p_period_id;
  if found and v_order_id is not null then
    update catering_orders
    set vendor_id = p_vendor_baru_id,
        respon_vendor = 'menunggu',
        progres_vendor = 'menunggu',
        updated_at = now()
    where id = v_order_id;

    insert into order_logs (order_id, aksi, keterangan, oleh)
    values (
      v_order_id,
      'ganti_vendor',
      format('Vendor diubah dari %s ke %s. Alasan: %s', v_vendor_lama_nama, v_vendor_baru_nama, p_alasan),
      auth.uid()
    );
  end if;

  return p_period_id;
end;
$$;

-- 6. konfirmasi_impor (Terapkan Data dari Batch Impor)
create or replace function konfirmasi_impor(
  p_batch_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_batch record;
  v_row jsonb;
  v_tgl date;
  v_shift_id uuid;
  v_vendor_id uuid;
  v_period_id uuid;
  v_order_id uuid;
  v_items jsonb;
  v_applied_count integer := 0;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin_ga' then
    raise exception 'Akses ditolak: hanya Admin GA yang dapat mengonfirmasi impor data.';
  end if;

  select * into v_batch from import_batches where id = p_batch_id;
  if not found then
    raise exception 'Batch impor tidak ditemukan.';
  end if;

  if v_batch.status <> 'draft' then
    raise exception 'Batch impor sudah berstatus % dan tidak dapat dikonfirmasi ulang.', v_batch.status;
  end if;

  for v_row in select * from jsonb_array_elements(v_batch.data_parsed) loop
    v_tgl := (v_row->>'tanggal')::date;
    v_shift_id := (v_row->>'shift_id')::uuid;
    v_vendor_id := (v_row->>'vendor_id')::uuid;
    v_items := v_row->'items';

    select id into v_period_id from periods where tanggal = v_tgl and shift_id = v_shift_id;
    if not found then
      insert into periods (tanggal, shift_id, vendor_id, keterangan)
      values (v_tgl, v_shift_id, v_vendor_id, 'Dibuat otomatis lewat impor batch ' || v_batch.nomor_batch)
      returning id into v_period_id;
    end if;

    perform simpan_catering(v_period_id, v_items, 'Diimpor dari berkas ' || v_batch.nama_file);
    v_applied_count := v_applied_count + 1;
  end loop;

  update import_batches
  set status = 'selesai',
      dikonfirmasi_at = now(),
      updated_at = now()
  where id = p_batch_id;

  return v_applied_count;
end;
$$;

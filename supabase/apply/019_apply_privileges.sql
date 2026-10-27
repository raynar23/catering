-- Apply Script: 019_apply_privileges.sql
-- Run in Supabase SQL Editor to enforce function execute privileges allowlist,
-- remove legacy stubs, add empty payload guard, and restrict bulk period deletion.

-- 1. Revoke default function privileges in public schema
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 2. Revoke execute privileges on all existing functions in public schema
revoke execute on all functions in schema public from public, anon, authenticated;

-- 3. Drop legacy / redundant stub functions (Audit H4.5)
drop function if exists public.is_admin_or_pic();
drop function if exists public.current_user_role();
drop function if exists public.current_user_vendor_id();

-- 4. Upgrade simpan_catering with empty payload guard and active bagian check (Audit H1.1)
create or replace function public.simpan_catering(
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
  v_period record;
  v_order_id uuid;
  v_item jsonb;
  v_bagian_id uuid;
  v_karyawan integer;
  v_porsi integer;
  v_ket text;
  v_valid_item_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: hanya General Affairs yang dapat menginput data catering.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Payload item catering tidak boleh kosong.';
  end if;

  select * into v_period from public.periods where id = p_period_id;
  if not found then
    raise exception 'Periode catering tidak ditemukan.';
  end if;

  -- Validate that p_items contains at least one valid item corresponding to active bagian
  for v_item in select * from jsonb_array_elements(p_items) loop
    if (v_item->>'bagian_id') is not null and exists (
      select 1 from public.bagian where id = (v_item->>'bagian_id')::uuid and aktif = true
    ) then
      v_valid_item_count := v_valid_item_count + 1;
    end if;
  end loop;

  if v_valid_item_count = 0 then
    raise exception 'Payload tidak valid: minimal satu bagian aktif yang valid wajib disertakan.';
  end if;

  select id, status into v_order_id from public.catering_orders where period_id = p_period_id;
  if found and v_order_id is not null then
    if (select status from public.catering_orders where id = v_order_id) not in ('draft') then
      raise exception 'Pesanan sudah berstatus % dan tidak dapat diubah langsung. Gunakan alur revisi.', (select status from public.catering_orders where id = v_order_id);
    end if;
    update public.catering_orders
    set catatan = coalesce(p_catatan, catatan),
        updated_at = now()
    where id = v_order_id;

    insert into public.order_logs (order_id, aksi, keterangan, oleh)
    values (v_order_id, 'simpan_draft', 'Memperbarui draft kebutuhan catering', auth.uid());
  else
    insert into public.catering_orders (
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

    insert into public.order_logs (order_id, aksi, keterangan, oleh)
    values (v_order_id, 'input_awal', 'Membuat draft kebutuhan catering', auth.uid());
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_bagian_id := (v_item->>'bagian_id')::uuid;
    v_karyawan := coalesce((v_item->>'jumlah_karyawan')::integer, 0);
    v_porsi := coalesce((v_item->>'jumlah_porsi')::integer, v_karyawan);
    v_ket := v_item->>'keterangan';

    if exists (select 1 from public.bagian where id = v_bagian_id) then
      insert into public.catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi, keterangan)
      values (v_order_id, v_bagian_id, v_karyawan, v_porsi, v_ket)
      on conflict (order_id, bagian_id)
      do update set
        jumlah_karyawan = excluded.jumlah_karyawan,
        jumlah_porsi = excluded.jumlah_porsi,
        keterangan = excluded.keterangan,
        updated_at = now();
    end if;
  end loop;

  return v_order_id;
end;
$$;

-- 5. Upgrade kirim_catering with is_admin() and active section enforcement
create or replace function public.kirim_catering(
  p_order_id uuid,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_total_aktif integer;
  v_total_terisi integer;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: hanya Admin GA yang dapat mengirim pesanan ke vendor.';
  end if;

  select * into v_order from public.catering_orders where id = p_order_id;
  if not found then
    raise exception 'Pesanan catering tidak ditemukan.';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'Pesanan sudah berstatus % dan tidak dapat dikirim ulang.', v_order.status;
  end if;

  select count(*) into v_total_aktif from public.bagian where aktif = true;
  select count(distinct ci.bagian_id) into v_total_terisi
  from public.catering_items ci
  join public.bagian b on b.id = ci.bagian_id
  where ci.order_id = p_order_id
    and b.aktif = true
    and ci.jumlah_porsi >= 0;

  if v_total_terisi < v_total_aktif then
    raise exception 'Pengiriman ditolak: seluruh bagian aktif wajib diisi jumlah porsinya sebelum dikirim ke vendor.';
  end if;

  update public.catering_orders
  set status = 'final',
      submitted_by = auth.uid(),
      submitted_at = now(),
      respon_vendor = 'menunggu',
      progres_vendor = 'menunggu',
      catatan = coalesce(p_catatan, catatan),
      updated_at = now()
  where id = p_order_id;

  insert into public.order_logs (order_id, aksi, keterangan, oleh)
  values (p_order_id, 'kirim_ke_vendor', coalesce(p_catatan, 'Pesanan difinalisasi dan dikirim ke vendor'), auth.uid());

  return p_order_id;
end;
$$;

-- 6. Upgrade ajukan_revisi with is_admin()
create or replace function public.ajukan_revisi(
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
  v_item record;
  v_revision_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: hanya Admin GA yang memiliki izin mengajukan revisi.';
  end if;

  if p_alasan is null or length(trim(p_alasan)) = 0 then
    raise exception 'Alasan revisi wajib diisi.';
  end if;

  if p_karyawan_baru < 0 or p_porsi_baru < 0 then
    raise exception 'Jumlah karyawan dan porsi baru tidak boleh negatif.';
  end if;

  select ci.*, o.status as order_status, o.id as order_id
  into v_item
  from public.catering_items ci
  join public.catering_orders o on o.id = ci.order_id
  where ci.id = p_item_id;

  if not found then
    raise exception 'Data item catering tidak ditemukan.';
  end if;

  if v_item.order_status not in ('final', 'revisi') then
    raise exception 'Revisi hanya dapat diajukan pada pesanan yang sudah Final.';
  end if;

  if exists (select 1 from public.revisions where item_id = p_item_id and status = 'menunggu') then
    raise exception 'Masih ada pengajuan revisi yang menunggu verifikasi untuk bagian ini.';
  end if;

  if p_karyawan_baru = v_item.jumlah_karyawan and p_porsi_baru = v_item.jumlah_porsi then
    raise exception 'Jumlah karyawan atau porsi revisi harus berbeda dari data saat ini.';
  end if;

  insert into public.revisions (
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

  update public.catering_orders
  set status = 'revisi',
      updated_at = now()
  where id = v_item.order_id;

  insert into public.order_logs (
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

-- 7. Upgrade ganti_vendor_periode with is_admin()
create or replace function public.ganti_vendor_periode(
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
  v_order_id uuid;
  v_vendor_lama_nama text;
  v_vendor_baru_nama text;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: hanya Admin GA yang dapat mengganti vendor periode.';
  end if;

  if p_alasan is null or length(trim(p_alasan)) = 0 then
    raise exception 'Alasan penggantian vendor wajib diisi.';
  end if;

  if not exists (select 1 from public.vendors where id = p_vendor_baru_id and aktif = true) then
    raise exception 'Vendor baru tidak ditemukan atau sedang dinonaktifkan.';
  end if;

  select v.nama into v_vendor_lama_nama
  from public.periods p
  join public.vendors v on v.id = p.vendor_id
  where p.id = p_period_id;

  select nama into v_vendor_baru_nama from public.vendors where id = p_vendor_baru_id;

  update public.periods
  set vendor_id = p_vendor_baru_id
  where id = p_period_id;

  select id into v_order_id from public.catering_orders where period_id = p_period_id;
  if found and v_order_id is not null then
    update public.catering_orders
    set vendor_id = p_vendor_baru_id,
        respon_vendor = 'menunggu',
        progres_vendor = 'menunggu',
        updated_at = now()
    where id = v_order_id;

    insert into public.order_logs (order_id, aksi, keterangan, oleh)
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

-- 8. Upgrade delete_selected_periods strictly for empty periods (Audit H4.4)
create or replace function public.delete_selected_periods(p_period_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  v_has_orders boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang diizinkan menghapus data periode';
  end if;

  if p_period_ids is null or array_length(p_period_ids, 1) = 0 then
    return jsonb_build_object('success', false, 'message', 'Tidak ada periode yang dipilih');
  end if;

  if array_length(p_period_ids, 1) > 100 then
    raise exception 'Batas maksimal penghapusan adalah 100 periode per panggilan.';
  end if;

  -- Strictly reject deletion if any period has existing orders
  select exists (
    select 1 from public.catering_orders
    where period_id = any(p_period_ids)
  ) into v_has_orders;

  if v_has_orders then
    raise exception 'Penghapusan ditolak: hanya periode tanpa pesanan (Belum Input) yang dapat dihapus. Periode dengan pesanan operasional tidak dapat dihapus.';
  end if;

  delete from public.periods
  where id = any(p_period_ids)
    and not exists (
      select 1 from public.catering_orders co where co.period_id = periods.id
    );

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'success', true,
    'deleted_count', v_count,
    'message', format('%s jadwal periode kosong berhasil dihapus', v_count)
  );
end;
$$;

-- 9. Explicit Allowlist Grants (Audit H4.2 & H4.3)

-- 9a. Helper RLS (authenticated only)
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_vendor_id() to authenticated;

-- 9b. RPC Admin GA (authenticated only)
grant execute on function public.simpan_catering(uuid, jsonb, text) to authenticated;
grant execute on function public.kirim_catering(uuid, text) to authenticated;
grant execute on function public.ajukan_revisi(uuid, integer, integer, text) to authenticated;
grant execute on function public.verifikasi_revisi(uuid, boolean, text) to authenticated;
grant execute on function public.ganti_vendor_periode(uuid, uuid, text) to authenticated;
grant execute on function public.konfirmasi_impor(uuid, jsonb) to authenticated;
grant execute on function public.dashboard_ringkasan(date, date) to authenticated;
grant execute on function public.get_rekap_harian(date, date, uuid, uuid, uuid) to authenticated;
grant execute on function public.get_rekap_ringkasan(date, date) to authenticated;
grant execute on function public.delete_selected_periods(uuid[]) to authenticated;

-- 9c. RPC Vendor (authenticated only)
grant execute on function public.respon_periode_vendor(uuid, boolean, text) to authenticated;
grant execute on function public.respon_revisi_vendor(uuid, boolean, text) to authenticated;
grant execute on function public.update_progres_vendor(uuid, vendor_progress, text) to authenticated;

-- 9d. Notification helper (authenticated only)
grant execute on function public.get_notifikasi() to authenticated;

-- 9e. Diagnostics & audit (service_role only, no API access)
grant execute on function public.check_db_count_and_sync() to service_role;

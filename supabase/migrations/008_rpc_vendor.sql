-- 008_rpc_vendor.sql
-- Migration 008: Vendor RPC Functions (Strict Vendor Isolation and Progressive States)

-- Helper function to map vendor_progress to numeric rank
create or replace function get_progress_rank(p_progres vendor_progress)
returns integer as $$
begin
  case p_progres
    when 'menunggu' then return 1;
    when 'dipersiapkan' then return 2;
    when 'dikirim' then return 3;
    when 'sampai' then return 4;
    when 'selesai' then return 5;
    else return 0;
  end case;
end;
$$ language plpgsql immutable;

-- 1. respon_periode_vendor (Sanggup / Tidak Sanggup Pesanan Periode)
create or replace function respon_periode_vendor(
  p_order_id uuid,
  p_sanggup boolean,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_vendor_id uuid;
  v_order record;
  v_status_respon vendor_response_status;
begin
  select role, vendor_id into v_role, v_vendor_id from profiles where id = auth.uid();
  if v_role <> 'vendor' then
    raise exception 'Akses ditolak: hanya akun vendor yang dapat memberikan respon kesanggupan.';
  end if;

  select * into v_order from catering_orders where id = p_order_id;
  if not found then
    raise exception 'Pesanan catering tidak ditemukan.';
  end if;

  if v_order.vendor_id <> v_vendor_id then
    raise exception 'Akses ditolak: Anda tidak memiliki akses ke pesanan vendor lain.';
  end if;

  if v_order.status not in ('final', 'revisi') then
    raise exception 'Pesanan belum difinalisasi oleh General Affairs.';
  end if;

  v_status_respon := case when p_sanggup then 'disanggupi'::vendor_response_status else 'tidak_sanggup'::vendor_response_status end;

  update catering_orders
  set respon_vendor = v_status_respon,
      respon_vendor_at = now(),
      catatan_vendor = coalesce(p_catatan, catatan_vendor),
      updated_at = now()
  where id = p_order_id;

  insert into order_logs (order_id, aksi, keterangan, oleh)
  values (
    p_order_id,
    case when p_sanggup then 'vendor_sanggup'::log_action else 'vendor_tidak_sanggup'::log_action end,
    coalesce(p_catatan, case when p_sanggup then 'Vendor menyanggupi pesanan' else 'Vendor menyatakan tidak sanggup' end),
    auth.uid()
  );

  return p_order_id;
end;
$$;

-- 2. respon_revisi_vendor (Respon Terhadap Pengajuan Revisi Porsi)
create or replace function respon_revisi_vendor(
  p_revision_id uuid,
  p_sanggup boolean,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_vendor_id uuid;
  v_rev record;
  v_status_respon vendor_response_status;
begin
  select role, vendor_id into v_role, v_vendor_id from profiles where id = auth.uid();
  if v_role <> 'vendor' then
    raise exception 'Akses ditolak: hanya vendor yang dapat memberikan respon revisi.';
  end if;

  select r.*, o.id as order_id, o.vendor_id as order_vendor_id
  into v_rev
  from revisions r
  join catering_items ci on ci.id = r.item_id
  join catering_orders o on o.id = ci.order_id
  where r.id = p_revision_id;

  if not found then
    raise exception 'Pengajuan revisi tidak ditemukan.';
  end if;

  if v_rev.order_vendor_id <> v_vendor_id then
    raise exception 'Akses ditolak: revisi ini bukan milik pesanan vendor Anda.';
  end if;

  if v_rev.status <> 'menunggu' then
    raise exception 'Revisi ini sudah selesai diverifikasi.';
  end if;

  v_status_respon := case when p_sanggup then 'disanggupi'::vendor_response_status else 'tidak_sanggup'::vendor_response_status end;

  update revisions
  set respon_vendor = v_status_respon,
      respon_vendor_at = now(),
      catatan_vendor = coalesce(p_catatan, catatan_vendor)
  where id = p_revision_id;

  insert into order_logs (order_id, item_id, revision_id, aksi, keterangan, oleh)
  values (
    v_rev.order_id,
    v_rev.item_id,
    p_revision_id,
    'revisi_respon_vendor',
    coalesce(p_catatan, case when p_sanggup then 'Vendor menyanggupi perubahan revisi' else 'Vendor tidak menyanggupi revisi' end),
    auth.uid()
  );

  return p_revision_id;
end;
$$;

-- 3. update_progres_vendor (Pembaruan Tahap Pengiriman Catering)
create or replace function update_progres_vendor(
  p_order_id uuid,
  p_progres vendor_progress,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_vendor_id uuid;
  v_order record;
  v_current_rank integer;
  v_new_rank integer;
begin
  select role, vendor_id into v_role, v_vendor_id from profiles where id = auth.uid();
  if v_role <> 'vendor' then
    raise exception 'Akses ditolak: hanya vendor yang dapat memperbarui progres pengiriman.';
  end if;

  select * into v_order from catering_orders where id = p_order_id;
  if not found then
    raise exception 'Pesanan catering tidak ditemukan.';
  end if;

  if v_order.vendor_id <> v_vendor_id then
    raise exception 'Akses ditolak: Anda tidak memiliki akses ke pesanan vendor lain.';
  end if;

  if v_order.respon_vendor <> 'disanggupi' then
    raise exception 'Progres hanya dapat diperbarui setelah pesanan disanggupi.';
  end if;

  v_current_rank := get_progress_rank(v_order.progres_vendor);
  v_new_rank := get_progress_rank(p_progres);

  if v_new_rank <= v_current_rank then
    raise exception 'Pembaruan progres ditolak: tahapan progres hanya dapat bergerak maju (status saat ini: %).', v_order.progres_vendor;
  end if;

  update catering_orders
  set progres_vendor = p_progres,
      progres_vendor_at = now(),
      updated_at = now()
  where id = p_order_id;

  insert into order_logs (order_id, aksi, keterangan, oleh)
  values (
    p_order_id,
    'vendor_update_progres',
    format('Tahap progres diperbarui menjadi %s. %s', p_progres, coalesce(p_catatan, '')),
    auth.uid()
  );

  return p_order_id;
end;
$$;

-- 4. get_notifikasi (Ringkasan Notifikasi untuk Akun yang Sedang Login)
create or replace function get_notifikasi()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_vendor_id uuid;
  v_result jsonb;
begin
  select role, vendor_id into v_role, v_vendor_id from profiles where id = auth.uid();

  if v_role in ('admin_ga', 'pic_unit', 'supervisor_ga') then
    select jsonb_build_object(
      'role', v_role,
      'revisi_menunggu', (select count(*) from revisions where status = 'menunggu'),
      'vendor_tidak_sanggup', (select count(*) from catering_orders where respon_vendor = 'tidak_sanggup' and status in ('final', 'revisi')),
      'pesanan_draft', (select count(*) from catering_orders where status = 'draft')
    ) into v_result;
  elsif v_role = 'vendor' then
    select jsonb_build_object(
      'role', v_role,
      'pesanan_baru_menunggu_respon', (
        select count(*) from catering_orders
        where vendor_id = v_vendor_id and status in ('final', 'revisi') and respon_vendor = 'menunggu'
      ),
      'revisi_menunggu_respon', (
        select count(*)
        from revisions r
        join catering_items ci on ci.id = r.item_id
        join catering_orders o on o.id = ci.order_id
        where o.vendor_id = v_vendor_id and r.status = 'menunggu' and r.respon_vendor = 'menunggu'
      ),
      'pesanan_aktif_dalam_pengiriman', (
        select count(*) from catering_orders
        where vendor_id = v_vendor_id and respon_vendor = 'disanggupi' and progres_vendor not in ('selesai')
      )
    ) into v_result;
  else
    v_result := '{}'::jsonb;
  end if;

  return v_result;
end;
$$;

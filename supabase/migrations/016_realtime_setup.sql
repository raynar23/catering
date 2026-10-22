-- Migration 016: Realtime publication, replica identity, and get_notifikasi upgrade

-- 1. Ensure full replica identity on transactional tables for comprehensive row updates
alter table public.periods replica identity full;
alter table public.catering_orders replica identity full;
alter table public.revisions replica identity full;
alter table public.order_logs replica identity full;

-- 2. Add transactional tables to supabase_realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.periods;
    exception when others then null;
    end;
    begin
      alter publication supabase_realtime add table public.catering_orders;
    exception when others then null;
    end;
    begin
      alter publication supabase_realtime add table public.revisions;
    exception when others then null;
    end;
    begin
      alter publication supabase_realtime add table public.order_logs;
    exception when others then null;
    end;
  end if;
end $$;

-- 3. Upgrade get_notifikasi() to return counts and the 10 most recent actionable items
create or replace function public.get_notifikasi()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_vendor_id uuid;
  v_result jsonb;
  v_revisi_count integer := 0;
  v_rejected_count integer := 0;
  v_new_orders_count integer := 0;
  v_vendor_revisi_count integer := 0;
  v_items jsonb := '[]'::jsonb;
begin
  select role, vendor_id into v_role, v_vendor_id from profiles where id = auth.uid();

  if v_role = 'admin_ga' then
    -- Count pending revisions for Admin GA
    select count(*) into v_revisi_count from revisions where status = 'menunggu';

    -- Count vendor rejections for Admin GA
    select count(*) into v_rejected_count
    from catering_orders
    where respon_vendor = 'tidak_sanggup' and status in ('final', 'revisi');

    -- Aggregate top 10 actionable notifications for Admin GA
    with admin_notifs as (
      -- Pending revisions
      select
        r.id::text as id,
        'Revisi Menunggu Verifikasi' as judul,
        'Revisi ' || to_char(r.selisih, 'SG999') || ' porsi diajukan pada ' || coalesce(to_char(p.tanggal, 'DD/MM/YYYY'), '') || ' (' || coalesce(s.nama, '') || ')' as pesan,
        '/admin/verifikasi' as tautan,
        r.created_at as waktu,
        'revisi' as tipe
      from revisions r
      join catering_items ci on ci.id = r.item_id
      join catering_orders o on o.id = ci.order_id
      join periods p on p.id = o.period_id
      left join shifts s on s.id = p.shift_id
      where r.status = 'menunggu'

      union all

      -- Rejected orders by vendor
      select
        o.id::text as id,
        'Pesanan Ditolak Vendor' as judul,
        'Mitra ' || coalesce(v.nama, 'Vendor') || ' tidak menyanggupi ' || coalesce(s.nama, '') || ' tanggal ' || coalesce(to_char(p.tanggal, 'DD/MM/YYYY'), '') as pesan,
        '/admin/verifikasi' as tautan,
        o.updated_at as waktu,
        'pesanan' as tipe
      from catering_orders o
      join periods p on p.id = o.period_id
      left join shifts s on s.id = p.shift_id
      left join vendors v on v.id = o.vendor_id
      where o.respon_vendor = 'tidak_sanggup' and o.status in ('final', 'revisi')

      order by waktu desc
      limit 10
    )
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'judul', judul,
        'pesan', pesan,
        'tautan', tautan,
        'waktu', waktu,
        'tipe', tipe
      )
    ), '[]'::jsonb) into v_items from admin_notifs;

    v_result := jsonb_build_object(
      'role', v_role,
      'total', v_revisi_count + v_rejected_count,
      'revisi_menunggu', v_revisi_count,
      'vendor_tidak_sanggup', v_rejected_count,
      'items', v_items
    );

  elsif v_role = 'vendor' then
    -- Count unresponded orders for Vendor
    select count(*) into v_new_orders_count
    from catering_orders
    where vendor_id = v_vendor_id and status in ('final', 'revisi') and respon_vendor = 'menunggu';

    -- Count unresponded revisions for Vendor
    select count(*) into v_vendor_revisi_count
    from revisions r
    join catering_items ci on ci.id = r.item_id
    join catering_orders o on o.id = ci.order_id
    where o.vendor_id = v_vendor_id and r.status = 'menunggu' and r.respon_vendor = 'menunggu';

    -- Aggregate top 10 actionable notifications for Vendor
    with vendor_notifs as (
      -- Unresponded new orders
      select
        o.id::text as id,
        'Permintaan Baru dari GA' as judul,
        'Pesanan katering ' || coalesce(s.nama, '') || ' tanggal ' || coalesce(to_char(p.tanggal, 'DD/MM/YYYY'), '') || ' menunggu konfirmasi' as pesan,
        '/vendor/ketersediaan' as tautan,
        o.updated_at as waktu,
        'pesanan' as tipe
      from catering_orders o
      join periods p on p.id = o.period_id
      left join shifts s on s.id = p.shift_id
      where o.vendor_id = v_vendor_id and o.status in ('final', 'revisi') and o.respon_vendor = 'menunggu'

      union all

      -- Unresponded revisions
      select
        r.id::text as id,
        'Pengajuan Revisi Kuota' as judul,
        'Revisi ' || to_char(r.selisih, 'SG999') || ' porsi pada ' || coalesce(to_char(p.tanggal, 'DD/MM/YYYY'), '') || ' (' || coalesce(s.nama, '') || ') menunggu konfirmasi' as pesan,
        '/vendor/ketersediaan' as tautan,
        r.created_at as waktu,
        'revisi' as tipe
      from revisions r
      join catering_items ci on ci.id = r.item_id
      join catering_orders o on o.id = ci.order_id
      join periods p on p.id = o.period_id
      left join shifts s on s.id = p.shift_id
      where o.vendor_id = v_vendor_id and r.status = 'menunggu' and r.respon_vendor = 'menunggu'

      order by waktu desc
      limit 10
    )
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'judul', judul,
        'pesan', pesan,
        'tautan', tautan,
        'waktu', waktu,
        'tipe', tipe
      )
    ), '[]'::jsonb) into v_items from vendor_notifs;

    v_result := jsonb_build_object(
      'role', v_role,
      'total', v_new_orders_count + v_vendor_revisi_count,
      'pesanan_baru_menunggu_respon', v_new_orders_count,
      'revisi_menunggu_respon', v_vendor_revisi_count,
      'items', v_items
    );

  else
    v_result := jsonb_build_object('total', 0, 'items', '[]'::jsonb);
  end if;

  return v_result;
end;
$$;

grant execute on function public.get_notifikasi() to authenticated;

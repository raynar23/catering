-- Migration: 018_reset_and_bulk_delete.sql
-- Bulk deletion and operational data reset for client handover

-- 1. Upgrade Trigger order_logs Immutability with bypass support
create or replace function public.prevent_order_logs_mod()
returns trigger as $$
begin
  if current_setting('app.bypass_order_logs_immutability', true) = 'on' then
    return old;
  end if;
  raise exception 'Riwayat order_logs bersifat append-only dan tidak boleh diubah atau dihapus.';
end;
$$ language plpgsql;

-- 2. Fungsi RPC: Hapus Jadwal Periode Terpilih Beserta Transaksinya (Admin GA)
create or replace function public.delete_selected_periods(p_period_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang diizinkan menghapus data periode';
  end if;

  if p_period_ids is null or array_length(p_period_ids, 1) = 0 then
    return jsonb_build_object('success', false, 'message', 'Tidak ada periode yang dipilih');
  end if;

  perform set_config('app.bypass_order_logs_immutability', 'on', true);

  delete from public.order_logs
  where order_id in (
    select id from public.catering_orders where period_id = any(p_period_ids)
  );

  delete from public.revisions
  where item_id in (
    select ci.id from public.catering_items ci
    join public.catering_orders co on co.id = ci.order_id
    where co.period_id = any(p_period_ids)
  );

  delete from public.catering_items
  where order_id in (
    select id from public.catering_orders where period_id = any(p_period_ids)
  );

  delete from public.catering_orders
  where period_id = any(p_period_ids);

  delete from public.periods
  where id = any(p_period_ids);

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'success', true,
    'deleted_count', v_count,
    'message', format('%s jadwal periode berhasil dihapus', v_count)
  );
end;
$$;

revoke execute on function public.delete_selected_periods(uuid[]) from public;
grant execute on function public.delete_selected_periods(uuid[]) to authenticated;

-- 3. Fungsi RPC: Reset Seluruh Data Operasional Catering (Client Handover)
create or replace function public.reset_operational_data(p_konfirmasi text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count_periods integer := 0;
  v_count_orders integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang diizinkan mereset data';
  end if;

  if upper(trim(p_konfirmasi)) not in ('HAPUS', 'HAPUS SEMUA DATA') then
    raise exception 'Konfirmasi tidak sesuai. Ketik "HAPUS" untuk melanjutkan.';
  end if;

  perform set_config('app.bypass_order_logs_immutability', 'on', true);

  select count(*) into v_count_periods from public.periods;
  select count(*) into v_count_orders from public.catering_orders;

  delete from public.order_logs;
  delete from public.revisions;
  delete from public.catering_items;
  delete from public.catering_orders;
  delete from public.periods;

  return jsonb_build_object(
    'success', true,
    'deleted_periods', v_count_periods,
    'deleted_orders', v_count_orders,
    'message', 'Seluruh data operasional catering berhasil dibersihkan.'
  );
end;
$$;

revoke execute on function public.reset_operational_data(text) from public;
grant execute on function public.reset_operational_data(text) to authenticated;

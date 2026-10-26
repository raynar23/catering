-- scripts/dev-reset.sql: Manual reset for development environments only.
-- Do not execute in production.

do $$
declare
  v_count_periods integer := 0;
  v_count_orders integer := 0;
begin
  perform set_config('app.bypass_order_logs_immutability', 'on', true);

  select count(*) into v_count_periods from public.periods;
  select count(*) into v_count_orders from public.catering_orders;

  -- Delete in dependency order
  delete from public.order_logs;
  delete from public.revisions;
  delete from public.catering_items;
  delete from public.catering_orders;
  delete from public.periods;

  raise notice 'Dev reset complete: % periods and % orders removed.', v_count_periods, v_count_orders;
end $$;

-- Apply script: function execute privileges lockdown and backup tables security hardening

begin;

-- Revoke execute on all public schema functions not belonging to extensions
do $$
declare
  r record;
  v_allowlist text[] := array[
    'is_admin',
    'my_vendor_id',
    'simpan_catering',
    'kirim_catering',
    'ajukan_revisi',
    'verifikasi_revisi',
    'ganti_vendor_periode',
    'konfirmasi_impor',
    'dashboard_ringkasan',
    'get_rekap_harian',
    'get_rekap_ringkasan',
    'delete_selected_periods',
    'respon_periode_vendor',
    'respon_revisi_vendor',
    'update_progres_vendor',
    'get_notifikasi'
  ];
begin
  -- Revoke all privileges from public, anon, and authenticated
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated', r.proname, r.args);
  end loop;

  -- Grant execute strictly to authenticated for allowlisted operational functions
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(v_allowlist)
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('grant execute on function public.%I(%s) to authenticated', r.proname, r.args);
  end loop;
end $$;

-- Revoke default execute privileges for future functions in public schema
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Ensure service_role retains all privileges on all public functions
grant all on all functions in schema public to service_role;

-- Introspection helper: audit function execution privilege matrix (service_role only)
create or replace function public.check_function_privileges()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'function_name', p.proname,
      'identity_arguments', pg_get_function_identity_arguments(p.oid),
      'is_security_definer', p.prosecdef,
      'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'service_role_execute', has_function_privilege('service_role', p.oid, 'EXECUTE')
    ) order by p.proname, pg_get_function_identity_arguments(p.oid)
  ), '[]'::jsonb)
  into v_result
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and not exists (
      select 1 from pg_depend d
      where d.objid = p.oid and d.deptype = 'e'
    );

  return v_result;
end;
$$;

-- Introspection helper: audit RLS and table privileges on public schema tables (service_role only)
create or replace function public.check_public_tables_rls()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'table_name', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'anon_select', has_table_privilege('anon', c.oid, 'SELECT'),
      'authenticated_select', has_table_privilege('authenticated', c.oid, 'SELECT')
    ) order by c.relname
  ), '[]'::jsonb)
  into v_result
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r';

  return v_result;
end;
$$;

-- Diagnostic and introspection functions restricted to service_role
revoke all on function public.check_db_count_and_sync() from public, anon, authenticated;
grant execute on function public.check_db_count_and_sync() to service_role;

revoke all on function public.check_triggers_status() from public, anon, authenticated;
grant execute on function public.check_triggers_status() to service_role;

revoke all on function public.check_function_privileges() from public, anon, authenticated;
grant execute on function public.check_function_privileges() to service_role;

revoke all on function public.check_public_tables_rls() from public, anon, authenticated;
grant execute on function public.check_public_tables_rls() to service_role;

-- Secure and remove any lingering backup tables in public schema
do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public' and tablename like '_backup_%'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on table public.%I from public, anon, authenticated', t.tablename);
    execute format('drop table if exists public.%I cascade', t.tablename);
  end loop;
end $$;

commit;

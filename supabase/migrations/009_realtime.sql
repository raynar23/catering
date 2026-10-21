-- 009_realtime.sql
-- Migration 009: Realtime Publication Configuration for Orders, Revisions, and Logs

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'catering_orders'
    ) then
      alter publication supabase_realtime add table catering_orders;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'revisions'
    ) then
      alter publication supabase_realtime add table revisions;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'order_logs'
    ) then
      alter publication supabase_realtime add table order_logs;
    end if;
  end if;
exception
  when others then
    null;
end $$;

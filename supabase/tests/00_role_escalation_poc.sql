-- Proof of Concept: Role escalation attempt from vendor to admin_ga
-- This test verifies that a vendor cannot alter their own role or sensitive columns

begin;

do $$
declare
  v_vendor_uid uuid := gen_random_uuid();
  v_vendor_id uuid;
  v_updated_count integer;
begin
  select id into v_vendor_id from vendors limit 1;

  -- Create a test vendor profile
  insert into profiles (id, username, nama, role, vendor_id, aktif)
  values (v_vendor_uid, 'test.attacker.vendor', 'Attacker Vendor', 'vendor', v_vendor_id, true);

  -- Simulate authenticated vendor session
  perform set_config('request.jwt.claims', json_build_object('sub', v_vendor_uid::text, 'role', 'authenticated')::text, true);

  -- Attempt privilege escalation
  begin
    update profiles
    set role = 'admin_ga'
    where id = v_vendor_uid;

    -- If updated without error, check if role changed
    get diagnostics v_updated_count = row_count;
    if v_updated_count > 0 then
      raise exception 'SECURITY VULNERABILITY: Vendor managed to escalate role to admin_ga!';
    end if;
  exception
    when others then
      if sqlerrm like '%Modifikasi kolom terlindungi%' or sqlerrm like '%permission denied%' or sqlerrm like '%Akses ditolak%' then
        raise notice 'SECURITY TEST PASSED: Role escalation was blocked successfully.';
      else
        raise;
      end if;
  end;
end $$;

rollback;

// Database security and isolation test runner for Catering TPS
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment from .env.local
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!url || !anonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const anonClient = createClient(url, anonKey);
const adminClient = createClient(url, serviceKey);

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("Starting Catering TPS database security test suite...\n");

  // Authenticate as vendor Aisya
  const { data: vendorAAuth, error: aErr } = await anonClient.auth.signInWithPassword({
    email: "vendor@tps.co.id",
    password: "vendortps2026",
  });

  if (aErr || !vendorAAuth.session) {
    console.error("Failed to login as vendor@tps.co.id:", aErr);
    process.exit(1);
  }

  const vendorAClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${vendorAAuth.session.access_token}` } }
  });

  // TEST 1: Role escalation attack must fail
  const { data: updateData, error: updateErr } = await vendorAClient
    .from("profiles")
    .update({ role: "admin_ga" })
    .eq("id", vendorAAuth.user.id)
    .select();

  const { data: profileCheck } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", vendorAAuth.user.id)
    .single();

  assert(
    profileCheck.role === "vendor" && (updateErr !== null || (updateData && updateData.length === 0)),
    "Test 1: Role escalation attempt (vendor -> admin_ga) is rejected"
  );

  // TEST 2: Vendor A cannot see Vendor B orders
  const { data: v2 } = await adminClient.from("vendors").select("id").eq("kode", "V002").single();
  const { data: crossOrders, error: crossErr } = await vendorAClient
    .from("catering_orders")
    .select("id, vendor_id")
    .eq("vendor_id", v2.id);

  assert(
    !crossErr && (!crossOrders || crossOrders.length === 0),
    "Test 2: Vendor Aisya cannot see Catering IBU (V002) orders"
  );

  // TEST 3: Vendor A cannot see other vendor profiles
  const { data: otherProfiles, error: pErr } = await vendorAClient
    .from("profiles")
    .select("id, username")
    .neq("id", vendorAAuth.user.id);

  assert(
    !pErr && (!otherProfiles || otherProfiles.length === 0),
    "Test 3: Vendor Aisya cannot see other vendor profiles"
  );

  // TEST 4: Direct client insert into catering_orders must fail
  const { error: insErr } = await vendorAClient
    .from("catering_orders")
    .insert({ vendor_id: v2.id, status: "final" });

  assert(
    insErr !== null,
    "Test 4: Direct client insert into catering_orders is blocked"
  );

  // TEST 5: Direct delete on order_logs must fail
  const { error: delErr } = await vendorAClient
    .from("order_logs")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  assert(
    delErr !== null,
    "Test 5: Direct delete on order_logs is blocked (append-only audit)"
  );

  // TEST 6: Calling admin RPC simpan_catering by vendor must fail
  const { error: rpcErr } = await vendorAClient.rpc("simpan_catering", {
    p_period_id: "00000000-0000-0000-0000-000000000000",
    p_items: []
  });

  assert(
    rpcErr !== null,
    "Test 6: Admin RPC simpan_catering called by vendor is rejected"
  );

  console.log(`\nTest results: ${passedCount} passed, ${failedCount} failed.`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

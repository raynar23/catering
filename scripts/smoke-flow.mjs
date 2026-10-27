// scripts/smoke-flow.mjs
// End-to-end operational smoke flow test suite for Catering TPS.
// Supports both single-admin and two-admin verification configurations (PRD A1).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[trimmed.slice(0, idx).trim()] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

// Target database execution guard (G4 & H3)
const PRODUCTION_SUPABASE_URL = process.env.PRODUCTION_SUPABASE_URL || "https://tdvfbtxlnlduajztojng.supabase.co";
const envAllowlist = (process.env.TEST_SUPABASE_URL_ALLOWLIST || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const TEST_SUPABASE_URL_ALLOWLIST = new Set([
  "http://127.0.0.1:54321",
  "http://localhost:54321",
  ...envAllowlist,
]);

const normalizedUrl = (url || "").trim().replace(/\/$/, "");
const isProduction = normalizedUrl === PRODUCTION_SUPABASE_URL.replace(/\/$/, "") || normalizedUrl.includes("tdvfbtxlnlduajztojng");
const isAllowedTestTarget = TEST_SUPABASE_URL_ALLOWLIST.has(normalizedUrl);

if (isProduction || !isAllowedTestTarget) {
  console.error("======================================================================");
  console.error("TEST EXECUTION BLOCKED PER RULE G4 & AUDIT H3");
  console.error(`Database Target: ${url}`);
  console.error("Reason: smoke-flow.mjs performs mutation tests and is strictly forbidden");
  console.error("from running against production. Target URL must be an explicit member");
  console.error("of TEST_SUPABASE_URL_ALLOWLIST (e.g. local Supabase or dedicated staging).");
  console.error("======================================================================\n");
  process.exit(1);
}

// Configuration: two-admin vs single-admin
const isTwoAdminMode = process.argv.includes("--two-admins") || process.env.SMOKE_TWO_ADMINS === "true";

// Read credentials strictly from environment variables (H5)
const adminEmail = env.TEST_ADMIN_EMAIL || "admin.ga@tps.co.id";
const adminPassword = env.TEST_ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD;
const admin2Email = env.TEST_ADMIN2_EMAIL || "admin2.ga@tps.co.id";
const admin2Password = env.TEST_ADMIN2_PASSWORD || process.env.TEST_ADMIN2_PASSWORD;
const vendorAisyaEmail = env.TEST_VENDOR_AISYA_EMAIL || "vendor.aisya@tps.co.id";
const vendorAisyaPassword = env.TEST_VENDOR_AISYA_PASSWORD || process.env.TEST_VENDOR_AISYA_PASSWORD;
const vendorIbuEmail = env.TEST_VENDOR_IBU_EMAIL || "vendor.ibu@tps.co.id";
const vendorIbuPassword = env.TEST_VENDOR_IBU_PASSWORD || process.env.TEST_VENDOR_IBU_PASSWORD;

if (!adminPassword || !vendorAisyaPassword || !vendorIbuPassword || (isTwoAdminMode && !admin2Password)) {
  console.error("Error: Missing required test credentials in environment variables.");
  console.error("Expected TEST_ADMIN_PASSWORD, TEST_VENDOR_AISYA_PASSWORD, TEST_VENDOR_IBU_PASSWORD, TEST_ADMIN2_PASSWORD.");
  console.error("Default hardcoded passwords were removed per audit H5.");
  process.exit(1);
}

const anonClient = createClient(url, anonKey);
const adminClient = createClient(url, serviceKey);

async function runSmokeFlow() {
  console.log("======================================================================");
  console.log("CATERING TPS - END-TO-END OPERATIONAL SMOKE FLOW TEST");
  console.log(`Target Database: ${url}`);
  console.log(`Mode Verifikasi: ${isTwoAdminMode ? "DUA ADMIN (Four-eyes)" : "SATU ADMIN (PRD A1 Single Admin)"}`);
  console.log(`Waktu Eksekusi: ${new Date().toISOString()}`);
  console.log("======================================================================\n");

  // Step 0: Authenticate user roles
  console.log("Step 0: Authenticating test accounts...");
  const authClientAdm1 = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: authAdmin, error: errAdm } = await authClientAdm1.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (errAdm || !authAdmin.session) {
    console.error(`Failed to authenticate ${adminEmail}:`, errAdm?.message);
    process.exit(1);
  }
  const clientAdmin = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${authAdmin.session.access_token}` } }
  });

  let clientAdmin2 = null;
  if (isTwoAdminMode) {
    const authClientAdm2 = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: authAdmin2, error: errAdm2 } = await authClientAdm2.auth.signInWithPassword({
      email: admin2Email,
      password: admin2Password,
    });
    if (errAdm2 || !authAdmin2.session) {
      console.error(`Failed to authenticate ${admin2Email}:`, errAdm2?.message);
      process.exit(1);
    }
    clientAdmin2 = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${authAdmin2.session.access_token}` } }
    });
  }

  const authClientA = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: authA, error: errA } = await authClientA.auth.signInWithPassword({
    email: vendorAisyaEmail,
    password: vendorAisyaPassword,
  });
  if (errA || !authA.session) {
    console.error(`Failed to authenticate ${vendorAisyaEmail}:`, errA?.message);
    process.exit(1);
  }
  const clientA = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${authA.session.access_token}` } }
  });

  const authClientB = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: authB, error: errB } = await authClientB.auth.signInWithPassword({
    email: vendorIbuEmail,
    password: vendorIbuPassword,
  });
  if (errB || !authB.session) {
    console.error(`Failed to authenticate ${vendorIbuEmail}:`, errB?.message);
    process.exit(1);
  }
  const clientB = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${authB.session.access_token}` } }
  });

  console.log("  [OK] Test accounts authenticated successfully.\n");

  // Fetch reference records
  const { data: vAisya } = await adminClient.from("vendors").select("id, nama").eq("kode", "V001").single();
  const { data: vIbu } = await adminClient.from("vendors").select("id, nama").eq("kode", "V002").single();
  const { data: shifts } = await adminClient.from("shifts").select("id, nama, urutan").order("urutan");
  const { data: bagianList } = await adminClient.from("bagian").select("id, nama").eq("aktif", true);

  // Test date allowlist guard: strictly inside the 2026-10-01 to 2026-12-31 schedule window
  const allowedMinDate = "2026-10-01";
  const allowedMaxDate = "2026-12-31";
  const testTanggal = process.env.SMOKE_TEST_DATE || "2026-10-26";
  if (testTanggal < allowedMinDate || testTanggal > allowedMaxDate) {
    throw new Error(`Execution blocked: Test date ${testTanggal} is outside allowed UAT window [${allowedMinDate} .. ${allowedMaxDate}].`);
  }

  // Flow 1: 3-shift order cycle
  console.log("----------------------------------------------------------------------");
  console.log(`FLOW 1: Catering Operational Cycle (Test Date: ${testTanggal})`);
  console.log("----------------------------------------------------------------------");

  const createdPeriodIds = [];
  const createdOrderIds = [];

  for (const shift of shifts) {
    const { data: period, error: pErr } = await adminClient
      .from("periods")
      .insert({
        tanggal: testTanggal,
        shift_id: shift.id,
        vendor_id: vAisya.id,
        keterangan: `Smoke flow test ${shift.nama}`
      })
      .select()
      .single();

    if (pErr) throw pErr;
    createdPeriodIds.push(period.id);

    const { data: order, error: oErr } = await adminClient
      .from("catering_orders")
      .insert({
        period_id: period.id,
        vendor_id: vAisya.id,
        status: "draft",
        created_by: authAdmin.user.id
      })
      .select()
      .single();

    if (oErr) throw oErr;
    createdOrderIds.push(order.id);

    const itemsToInsert = bagianList.map((b) => ({
      order_id: order.id,
      bagian_id: b.id,
      jumlah_karyawan: 20,
      jumlah_porsi: 20,
      keterangan: "Smoke test portion"
    }));

    const { error: iErr } = await adminClient.from("catering_items").insert(itemsToInsert);
    if (iErr) throw iErr;
  }

  console.log(`  [OK] Created 3 periods and draft orders for ${testTanggal}.`);

  const testOrderId = createdOrderIds[0];
  const { error: kirimErr } = await clientAdmin.rpc("kirim_catering", {
    p_order_id: testOrderId,
    p_catatan: "Smoke test dispatch"
  });
  if (kirimErr) console.error("Failed to dispatch:", kirimErr.message);
  console.log("  [OK] Admin finalized and sent catering order to Vendor Aisya.");

  const { error: respErr } = await clientA.rpc("respon_periode_vendor", {
    p_order_id: testOrderId,
    p_sanggup: true,
    p_catatan: "Aisya menyanggupi pesanan"
  });
  if (respErr) console.error("Failed vendor response:", respErr.message);
  console.log("  [OK] Vendor Aisya accepted order (respon: disanggupi).");

  const stages = ["dipersiapkan", "dikirim", "sampai", "selesai"];
  for (const stage of stages) {
    await clientA.rpc("update_progres_vendor", {
      p_order_id: testOrderId,
      p_progres: stage
    });
  }
  console.log("  [OK] Vendor Aisya advanced progress: dipersiapkan -> dikirim -> sampai -> selesai.");

  const { data: orderCheck } = await clientAdmin
    .from("catering_orders")
    .select("status, respon_vendor, progres_vendor")
    .eq("id", testOrderId)
    .single();

  console.log(`  [VERIFICATION]: Status=${orderCheck.status}, Respon=${orderCheck.respon_vendor}, Progres=${orderCheck.progres_vendor}`);
  const alur1Passed = orderCheck.status === "final" && orderCheck.respon_vendor === "disanggupi" && orderCheck.progres_vendor === "selesai";
  console.log(`  FLOW 1 RESULT: ${alur1Passed ? "PASS" : "FAIL"}\n`);

  // Flow 2: Revision workflow and quota calculation consistency (20 -> 23)
  console.log("----------------------------------------------------------------------");
  console.log(`FLOW 2: Revision Workflow & Verification (${isTwoAdminMode ? "Admin 2 verifier" : "Single Admin verifier"})`);
  console.log("----------------------------------------------------------------------");

  const { data: itemToRevise } = await adminClient
    .from("catering_items")
    .select("id, bagian_id, jumlah_porsi, jumlah_karyawan")
    .eq("order_id", testOrderId)
    .limit(1)
    .single();

  const { error: revErr } = await clientAdmin.rpc("ajukan_revisi", {
    p_item_id: itemToRevise.id,
    p_karyawan_baru: 23,
    p_porsi_baru: 23,
    p_alasan: "Addition of 3 overtime operators"
  });
  if (revErr) console.error("Failed to propose revision:", revErr.message);
  console.log("  [OK] Admin 1 proposed revision: 20 -> 23 portions (+3 portions). Status: Pending.");

  const { data: rekapPending } = await clientAdmin
    .from("v_rekap")
    .select("jumlah_porsi")
    .eq("order_id", testOrderId)
    .eq("bagian_id", itemToRevise.bagian_id)
    .single();

  const isPending20 = rekapPending?.jumlah_porsi === 20;
  console.log(`  [PENDING RECAP CHECK]: Portions in v_rekap = ${rekapPending?.jumlah_porsi} (Expected: 20) -> ${isPending20 ? "CORRECT" : "MISMATCH"}`);

  const { data: revRecord } = await adminClient
    .from("revisions")
    .select("id, status")
    .eq("item_id", itemToRevise.id)
    .eq("status", "menunggu")
    .single();

  // Verification executor: Admin 1 in single mode, Admin 2 in two-admin mode
  const verifierClient = isTwoAdminMode ? clientAdmin2 : clientAdmin;
  const verifierName = isTwoAdminMode ? "Admin GA 2" : "Admin GA 1 (Self-verification per PRD A1)";

  const { error: verifErr } = await verifierClient.rpc("verifikasi_revisi", {
    p_revision_id: revRecord.id,
    p_setuju: true,
    p_catatan: `Approved by ${verifierName}`
  });
  if (verifErr) console.error("Failed to verify revision:", verifErr.message);
  console.log(`  [OK] ${verifierName} verified revision (Status: Approved).`);

  const { data: rekapVerified } = await clientAdmin
    .from("v_rekap")
    .select("jumlah_porsi")
    .eq("order_id", testOrderId)
    .eq("bagian_id", itemToRevise.bagian_id)
    .single();

  const isVerified23 = rekapVerified?.jumlah_porsi === 23;
  console.log(`  [VERIFIED RECAP CHECK]: Portions in v_rekap = ${rekapVerified?.jumlah_porsi} (Expected: 23) -> ${isVerified23 ? "CORRECT" : "MISMATCH"}`);

  const { data: logs } = await adminClient
    .from("order_logs")
    .select("aksi, jumlah_awal, selisih, jumlah_baru, keterangan")
    .eq("order_id", testOrderId)
    .eq("aksi", "revisi_disetujui")
    .limit(1)
    .single();

  const logValid = logs && logs.selisih === 3 && logs.jumlah_baru === 23;
  console.log(`  [AUDIT LOG CHECK]: Action=${logs?.aksi}, Diff=+${logs?.selisih}, New=${logs?.jumlah_baru}`);
  const alur2Passed = isPending20 && isVerified23 && logValid;
  console.log(`  FLOW 2 RESULT: ${alur2Passed ? "PASS" : "FAIL"}\n`);

  // Flow 3: Verify isolation for Vendor B
  console.log("----------------------------------------------------------------------");
  console.log("FLOW 3: Vendor B Isolation Verification (Catering IBU)");
  console.log("----------------------------------------------------------------------");

  const { data: bOrders } = await clientB.from("catering_orders").select("id").eq("id", testOrderId);
  const { data: bItems } = await clientB.from("catering_items").select("id").eq("order_id", testOrderId);
  const { data: bRevs } = await clientB.from("revisions").select("id").eq("item_id", itemToRevise.id);
  const { data: bLogs } = await clientB.from("order_logs").select("id").eq("order_id", testOrderId);

  const leakOrders = bOrders?.length || 0;
  const leakItems = bItems?.length || 0;
  const leakRevs = bRevs?.length || 0;
  const leakLogs = bLogs?.length || 0;

  console.log(`  [DATA LEAK AUDIT]: orders=${leakOrders}, items=${leakItems}, revisions=${leakRevs}, logs=${leakLogs}`);
  const alur3Passed = leakOrders === 0 && leakItems === 0 && leakRevs === 0 && leakLogs === 0;
  console.log(`  FLOW 3 RESULT: ${alur3Passed ? "PASS" : "FAIL"}\n`);

  // Flow 4: Vendor synchronization trigger scenario
  console.log("----------------------------------------------------------------------");
  console.log("FLOW 4: Vendor Synchronization Trigger (Direct Update & RPC)");
  console.log("----------------------------------------------------------------------");

  const testPeriodId = createdPeriodIds[1];
  const testOrderId2 = createdOrderIds[1];

  // 4a: Direct update on periods.vendor_id
  await adminClient.from("periods").update({ vendor_id: vIbu.id }).eq("id", testPeriodId);
  const { data: directSyncedOrder } = await adminClient
    .from("catering_orders")
    .select("vendor_id")
    .eq("id", testOrderId2)
    .single();

  const directSyncPassed = directSyncedOrder?.vendor_id === vIbu.id;
  console.log(`  [DIRECT UPDATE TRIGGER]: catering_orders.vendor_id synced to V002 -> ${directSyncPassed ? "PASS" : "FAIL"}`);

  // 4b: Update via ganti_vendor_periode RPC
  const { error: gantiErr } = await clientAdmin.rpc("ganti_vendor_periode", {
    p_period_id: testPeriodId,
    p_vendor_baru_id: vAisya.id,
    p_alasan: "Switching back to V001 via RPC"
  });
  if (gantiErr) console.error("Failed ganti_vendor_periode:", gantiErr.message);

  const { data: rpcSyncedOrder } = await adminClient
    .from("catering_orders")
    .select("vendor_id")
    .eq("id", testOrderId2)
    .single();

  const rpcSyncPassed = rpcSyncedOrder?.vendor_id === vAisya.id;
  console.log(`  [RPC GANTI VENDOR]: catering_orders.vendor_id reverted to V001 -> ${rpcSyncPassed ? "PASS" : "FAIL"}`);

  const alur4Passed = directSyncPassed && rpcSyncPassed;
  console.log(`  FLOW 4 RESULT: ${alur4Passed ? "PASS" : "FAIL"}\n`);

  // Cleanup test data
  console.log("Cleaning up smoke flow test records...");
  await adminClient.from("order_logs").delete().in("order_id", createdOrderIds);
  await adminClient.from("revisions").delete().eq("item_id", itemToRevise.id);
  await adminClient.from("catering_items").delete().in("order_id", createdOrderIds);
  await adminClient.from("catering_orders").delete().in("id", createdOrderIds);
  await adminClient.from("periods").delete().in("id", createdPeriodIds);
  console.log("  [OK] Cleanup completed.\n");

  const allPassed = alur1Passed && alur2Passed && alur3Passed && alur4Passed;
  console.log("======================================================================");
  console.log(`SMOKE FLOW SUMMARY: ${allPassed ? "100% PASS (ALL FLOWS PASSED)" : "FAILED"}`);
  console.log("======================================================================\n");

  if (!allPassed) process.exit(1);
}

runSmokeFlow().catch((err) => {
  console.error("Smoke flow execution error:", err);
  process.exit(1);
});

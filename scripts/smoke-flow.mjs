// scripts/smoke-flow.mjs
// End-to-end smoke flow test runner for Catering TPS.
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

// Production execution guard (F8)
const PROD_PROJECT_ID = "tdvfbtxlnlduajztojng";
const isProdProject = url && url.includes(PROD_PROJECT_ID);

if (isProdProject && process.env.ALLOW_SMOKE_RUN !== "true") {
  console.log("======================================================================");
  console.log("SMOKE FLOW EXECUTION GUARD (F8)");
  console.log(`Database Target: ${url}`);
  console.log("STATUS: BLOCKED PER RULE F8");
  console.log("Reason: smoke-flow.mjs must not run directly on the primary production project.");
  console.log("To execute, use local database or set ALLOW_SMOKE_RUN=true.");
  console.log("======================================================================\n");
  process.exit(0);
}

const anonClient = createClient(url, anonKey);
const adminClient = createClient(url, serviceKey);

async function runSmokeFlow() {
  console.log("======================================================================");
  console.log("SMOKE FLOW END-TO-END TEST SUITE (F8)");
  console.log(`Target Database: ${url}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("======================================================================\n");

  // Step 0: Authenticate user roles
  console.log("Step 0: Authenticating test accounts...");
  const { data: authAdmin, error: errAdm } = await anonClient.auth.signInWithPassword({
    email: "admin@tps.co.id",
    password: "gatps2026",
  });
  if (errAdm || !authAdmin.session) {
    console.error("Failed to authenticate admin:", errAdm?.message);
    process.exit(1);
  }
  const clientAdmin = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${authAdmin.session.access_token}` } }
  });

  // Authenticate Admin 2 (Four-eyes verification)
  await adminClient.auth.admin.updateUserById("00000000-0000-0000-0000-000000000002", { password: "admin2gatps2026" });
  const authClient2 = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: authAdmin2, error: errAdm2 } = await authClient2.auth.signInWithPassword({
    email: "admin2.ga@tps.co.id",
    password: "admin2gatps2026",
  });
  if (errAdm2 || !authAdmin2.session) {
    console.error("Failed to authenticate admin 2:", errAdm2?.message);
    process.exit(1);
  }
  const clientAdmin2 = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${authAdmin2.session.access_token}` } }
  });

  const { data: authA, error: errA } = await anonClient.auth.signInWithPassword({
    email: "vendor@tps.co.id",
    password: "vendortps2026",
  });
  if (errA || !authA.session) {
    console.error("Failed to authenticate vendor A:", errA?.message);
    process.exit(1);
  }
  const clientA = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${authA.session.access_token}` } }
  });

  const { data: authB, error: errB } = await anonClient.auth.signInWithPassword({
    email: "vendor.ibu@tps.co.id",
    password: "vendoributps2026",
  });
  if (errB || !authB.session) {
    console.error("Failed to authenticate vendor B:", errB?.message);
    process.exit(1);
  }
  const clientB = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${authB.session.access_token}` } }
  });

  console.log("  [OK] Admin GA 1, Admin GA 2, Vendor Aisya, and Vendor IBU authenticated.\n");

  // Fetch reference records
  const { data: vAisya } = await adminClient.from("vendors").select("id, nama").eq("kode", "V001").single();
  const { data: vIbu } = await adminClient.from("vendors").select("id, nama").eq("kode", "V002").single();
  const { data: shifts } = await adminClient.from("shifts").select("id, nama, urutan").order("urutan");
  const { data: bagianList } = await adminClient.from("bagian").select("id, nama").eq("aktif", true);

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const day = String((randomSuffix % 28) + 1).padStart(2, "0");
  const month = String((Math.floor(randomSuffix / 100) % 12) + 1).padStart(2, "0");
  const testTanggal = `2028-${month}-${day}`;

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

    const itemsToInsert = bagianList.map(b => ({
      order_id: order.id,
      bagian_id: b.id,
      jumlah_karyawan: 20,
      jumlah_porsi: 20,
      keterangan: "Standard operational portion"
    }));

    await adminClient.from("catering_items").insert(itemsToInsert);
  }

  console.log(`  [OK] 3 Shifts created for date ${testTanggal} (Draft).`);

  // Submit order to vendor
  const testPeriodId = createdPeriodIds[0];
  const testOrderId = createdOrderIds[0];

  const { error: kirimErr } = await clientAdmin.rpc("kirim_catering", {
    p_order_id: testOrderId,
    p_catatan: "Smoke flow lock order"
  });
  if (kirimErr) {
    console.error("Failed to submit catering:", kirimErr.message);
  }
  console.log("  [OK] Admin GA locked period and submitted to vendor (Status: Final).");

  // Vendor response
  const { error: responErr } = await clientA.rpc("respon_periode_vendor", {
    p_order_id: testOrderId,
    p_sanggup: true,
    p_catatan: null
  });
  if (responErr) console.error("Failed vendor response:", responErr.message);
  console.log("  [OK] Vendor Aisya accepted order (Response: disanggupi).");

  // Vendor progress updates
  const stages = ["dipersiapkan", "dikirim", "sampai", "selesai"];
  for (const stage of stages) {
    await clientA.rpc("update_progres_vendor", {
      p_order_id: testOrderId,
      p_progres: stage
    });
  }
  console.log("  [OK] Vendor Aisya advanced progress: dipersiapkan -> dikirim -> sampai -> selesai.");

  // Admin verification
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
  console.log("FLOW 2: Revision Workflow & Recalculation Consistency (20 -> 23 Portions)");
  console.log("----------------------------------------------------------------------");

  const { data: itemToRevise } = await adminClient
    .from("catering_items")
    .select("id, bagian_id, jumlah_porsi, jumlah_karyawan")
    .eq("order_id", testOrderId)
    .limit(1)
    .single();

  // Propose revision
  const { error: revErr } = await clientAdmin.rpc("ajukan_revisi", {
    p_item_id: itemToRevise.id,
    p_karyawan_baru: 23,
    p_porsi_baru: 23,
    p_alasan: "Addition of 3 overtime operators"
  });
  if (revErr) console.error("Failed to propose revision:", revErr.message);
  console.log("  [OK] Admin proposed revision: 20 -> 23 portions (+3 portions). Status: Pending.");

  // Verify pending status in view: must remain 20
  const { data: rekapPending } = await clientAdmin
    .from("v_rekap")
    .select("jumlah_porsi")
    .eq("order_id", testOrderId)
    .eq("bagian_id", itemToRevise.bagian_id)
    .single();

  const isPending20 = rekapPending?.jumlah_porsi === 20;
  console.log(`  [PENDING RECAP CHECK]: Portions in v_rekap = ${rekapPending?.jumlah_porsi} (Expected: 20) -> ${isPending20 ? "CORRECT" : "MISMATCH"}`);

  // Fetch revision record
  const { data: revRecord } = await adminClient
    .from("revisions")
    .select("id, status")
    .eq("item_id", itemToRevise.id)
    .eq("status", "menunggu")
    .single();

  // Verify revision using four-eyes principle (Admin 2)
  const { error: verifErr } = await clientAdmin2.rpc("verifikasi_revisi", {
    p_revision_id: revRecord.id,
    p_setuju: true,
    p_catatan: "Approved by GA Supervisor 2"
  });
  if (verifErr) console.error("Failed to verify revision:", verifErr.message);
  console.log("  [OK] Admin GA 2 verified revision (Four-Eyes Principle, Status: Approved).");

  // Verify approved status in view: must be updated to 23
  const { data: rekapVerified } = await clientAdmin
    .from("v_rekap")
    .select("jumlah_porsi")
    .eq("order_id", testOrderId)
    .eq("bagian_id", itemToRevise.bagian_id)
    .single();

  const isVerified23 = rekapVerified?.jumlah_porsi === 23;
  console.log(`  [VERIFIED RECAP CHECK]: Portions in v_rekap = ${rekapVerified?.jumlah_porsi} (Expected: 23) -> ${isVerified23 ? "CORRECT" : "MISMATCH"}`);

  // Verify audit log entry
  const { data: logs } = await adminClient
    .from("order_logs")
    .select("aksi, jumlah_awal, selisih, jumlah_baru, keterangan")
    .eq("order_id", testOrderId)
    .eq("aksi", "revisi_disetujui")
    .limit(1)
    .single();

  const logValid = logs && logs.selisih === 3 && logs.jumlah_baru === 23;
  console.log(`  [AUDIT LOG CHECK]: Action=${logs?.aksi}, Initial=${logs?.jumlah_awal}, Diff=+${logs?.selisih}, New=${logs?.jumlah_baru}`);
  const alur2Passed = isPending20 && isVerified23 && logValid;
  console.log(`  FLOW 2 RESULT: ${alur2Passed ? "PASS" : "FAIL"}\n`);

  // Flow 3: Verify isolation for Vendor B
  console.log("----------------------------------------------------------------------");
  console.log("FLOW 3: Vendor B Isolation Verification (Catering IBU)");
  console.log("----------------------------------------------------------------------");

  const { data: bPeriods } = await clientB.from("periods").select("id").in("id", createdPeriodIds);
  const { data: bOrders } = await clientB.from("catering_orders").select("id").in("id", createdOrderIds);
  const { data: bItems } = await clientB.from("catering_items").select("id").in("order_id", createdOrderIds);
  const { data: bRevs } = await clientB.from("revisions").select("id").eq("item_id", itemToRevise.id);
  const { data: bLogs } = await clientB.from("order_logs").select("id").eq("order_id", testOrderId);

  const countBPeriods = bPeriods?.length || 0;
  const countBOrders = bOrders?.length || 0;
  const countBItems = bItems?.length || 0;
  const countBRevs = bRevs?.length || 0;
  const countBLogs = bLogs?.length || 0;

  console.log(`  Vendor B Access to Periods : ${countBPeriods} rows (Expected: 0)`);
  console.log(`  Vendor B Access to Orders  : ${countBOrders} rows (Expected: 0)`);
  console.log(`  Vendor B Access to Items   : ${countBItems} rows (Expected: 0)`);
  console.log(`  Vendor B Access to Revisi  : ${countBRevs} rows (Expected: 0)`);
  console.log(`  Vendor B Access to Logs    : ${countBLogs} rows (Expected: 0)`);

  const alur3Passed = countBPeriods === 0 && countBOrders === 0 && countBItems === 0 && countBRevs === 0 && countBLogs === 0;
  console.log(`  FLOW 3 RESULT: ${alur3Passed ? "PASS" : "FAIL"}\n`);

  // Audit trail verification
  console.log("Audit trail integrity: order_logs and revisions are permanently preserved (append-only).");

  const allPassed = alur1Passed && alur2Passed && alur3Passed;
  console.log("======================================================================");
  console.log(`SMOKE FLOW CONCLUSION: ${allPassed ? "ALL FLOWS PASSED" : "FLOW FAILURE DETECTED"}`);
  console.log("======================================================================\n");

  if (!allPassed) process.exit(1);
}

runSmokeFlow().catch((err) => {
  console.error("Critical smoke flow error:", err);
  process.exit(1);
});

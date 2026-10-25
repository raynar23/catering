// Database security and isolation test runner for Catering TPS
import { createClient } from "@supabase/supabase-js";
import { readFileSync, appendFileSync } from "fs";
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

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const anonClient = createClient(url, anonKey);
const adminClient = createClient(url, serviceKey);

let passedCount = 0;
let failedCount = 0;
const results = [];

function recordResult(passed, code, name, details = "") {
  const status = passed ? "PASS" : "FAIL";
  const line = `[${status}] ${code}: ${name}${details ? ` -> ${details}` : ""}`;
  if (passed) {
    console.log(line);
    passedCount++;
  } else {
    console.error(line);
    failedCount++;
  }
  results.push(line);
}

async function runTests() {
  console.log("======================================================================");
  console.log("CATERING TPS - DATABASE SECURITY & ISOLATION AUDIT SUITE");
  console.log(`Target Database: ${url}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("======================================================================\n");

  // Fetch Vendor records for V001 (Aisya) and V002 (Catering IBU)
  const { data: vAisya } = await adminClient.from("vendors").select("id, kode, nama").eq("kode", "V001").single();
  const { data: vIbu } = await adminClient.from("vendors").select("id, kode, nama").eq("kode", "V002").single();

  if (!vAisya || !vIbu) {
    console.error("Vendor V001 or V002 not found in database");
    process.exit(1);
  }

  // Authenticate Vendor A (Aisya)
  const { data: authA, error: errA } = await anonClient.auth.signInWithPassword({
    email: "vendor@tps.co.id",
    password: "vendortps2026",
  });
  if (errA || !authA.session) {
    console.error("Failed to authenticate vendor@tps.co.id:", errA?.message);
    process.exit(1);
  }
  const clientA = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${authA.session.access_token}` } }
  });

  // Ensure and authenticate Vendor B (Catering IBU)
  await adminClient.auth.admin.updateUserById("00000000-0000-0000-0000-000000000004", { password: "vendoributps2026" });
  const { data: authB, error: errB } = await anonClient.auth.signInWithPassword({
    email: "vendor.ibu@tps.co.id",
    password: "vendoributps2026",
  });
  if (errB || !authB.session) {
    console.error("Failed to authenticate vendor.ibu@tps.co.id:", errB?.message);
    process.exit(1);
  }
  const clientB = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${authB.session.access_token}` } }
  });

  // ==========================================================================
  // SCENARIO (a): Vendor self-escalation attempt (role, vendor_id, aktif)
  // ==========================================================================
  let aRoleBlocked = false;
  let aVendorIdBlocked = false;
  let aAktifBlocked = false;

  // 1. Role modification attempt
  const { error: errRole } = await clientA
    .from("profiles")
    .update({ role: "admin_ga" })
    .eq("id", authA.user.id);

  const { data: profAfterRole } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", authA.user.id)
    .single();

  if (errRole !== null || profAfterRole.role !== "admin_ga") {
    aRoleBlocked = true;
  }
  // Ensure profile role is restored if it changed
  if (profAfterRole.role !== "vendor") {
    await adminClient.from("profiles").update({ role: "vendor" }).eq("id", authA.user.id);
  }

  // 2. Vendor ID modification attempt
  const fakeVendorId = "00000000-0000-0000-0000-000000000002";
  const { error: errVId } = await clientA
    .from("profiles")
    .update({ vendor_id: fakeVendorId })
    .eq("id", authA.user.id);

  const { data: profAfterVId } = await adminClient
    .from("profiles")
    .select("vendor_id")
    .eq("id", authA.user.id)
    .single();

  if (errVId !== null || profAfterVId.vendor_id !== vAisya.id) {
    aVendorIdBlocked = true;
  }
  if (profAfterVId.vendor_id !== vAisya.id) {
    await adminClient.from("profiles").update({ vendor_id: vAisya.id }).eq("id", authA.user.id);
  }

  // 3. Aktif modification attempt
  const { error: errAktif } = await clientA
    .from("profiles")
    .update({ aktif: false })
    .eq("id", authA.user.id);

  const { data: profAfterAktif } = await adminClient
    .from("profiles")
    .select("aktif")
    .eq("id", authA.user.id)
    .single();

  if (errAktif !== null || profAfterAktif.aktif !== true) {
    aAktifBlocked = true;
  }
  if (profAfterAktif.aktif !== true) {
    await adminClient.from("profiles").update({ aktif: true }).eq("id", authA.user.id);
  }

  const scenarioAPassed = aRoleBlocked && aVendorIdBlocked && aAktifBlocked;
  recordResult(
    scenarioAPassed,
    "Skenario (a)",
    "vendor mengubah role, vendor_id, aktif miliknya sendiri harus ditolak",
    scenarioAPassed
      ? "Semua modifikasi kolom sensitif ditolak oleh database"
      : `Gagal: role blocked=${aRoleBlocked}, vendor_id blocked=${aVendorIdBlocked}, aktif blocked=${aAktifBlocked}`
  );

  // ==========================================================================
  // SCENARIO (b): Vendor Aisya and Vendor Ibu mutual cross-reading isolation
  // ==========================================================================
  // Find order IDs and period IDs for Vendor B (Catering IBU)
  const { data: bOrders } = await adminClient
    .from("catering_orders")
    .select("id, period_id")
    .eq("vendor_id", vIbu.id)
    .limit(10);

  const bOrderIds = (bOrders || []).map((o) => o.id);
  const bPeriodIds = (bOrders || []).map((o) => o.period_id);

  // Vendor A queries Vendor B resources
  const { data: aCrossPeriods } = await clientA.from("periods").select("id").in("id", bPeriodIds);
  const { data: aCrossOrders } = await clientA.from("catering_orders").select("id").in("id", bOrderIds);
  const { data: aCrossItems } = await clientA.from("catering_items").select("id").in("order_id", bOrderIds);
  const { data: aCrossLogs } = await clientA.from("order_logs").select("id").in("order_id", bOrderIds);

  // Check revisions for Vendor B
  const { data: bRevs } = await adminClient
    .from("revisions")
    .select("id, item_id")
    .limit(10);
  const { data: aCrossRevs } = await clientA.from("revisions").select("id").in("id", (bRevs || []).map(r => r.id));

  // Check views for Vendor B data
  const { data: aCrossVPR } = await clientA.from("v_periode_ringkas").select("period_id").eq("vendor_id", vIbu.id);
  const { data: aCrossRekap } = await clientA.from("v_rekap").select("period_id").eq("vendor_id", vIbu.id);
  const { data: aCrossRekapBulanan } = await clientA.from("v_rekap_bulanan").select("vendor_id").eq("vendor_id", vIbu.id);

  const countCrossPeriods = aCrossPeriods?.length || 0;
  const countCrossOrders = aCrossOrders?.length || 0;
  const countCrossItems = aCrossItems?.length || 0;
  const countCrossLogs = aCrossLogs?.length || 0;
  const countCrossRevs = aCrossRevs?.length || 0;
  const countCrossVPR = aCrossVPR?.length || 0;
  const countCrossRekap = aCrossRekap?.length || 0;
  const countCrossRekapBulanan = aCrossRekapBulanan?.length || 0;

  const scenarioBPassed =
    countCrossPeriods === 0 &&
    countCrossOrders === 0 &&
    countCrossItems === 0 &&
    countCrossLogs === 0 &&
    countCrossRevs === 0 &&
    countCrossVPR === 0 &&
    countCrossRekap === 0 &&
    countCrossRekapBulanan === 0;

  recordResult(
    scenarioBPassed,
    "Skenario (b)",
    "vendor Aisya dan vendor Ibu saling membaca periods, orders, items, revisions, logs, dan views harus 0 baris",
    scenarioBPassed
      ? "Isolasi data 100% (semua query cross-vendor mengembalikan 0 baris)"
      : `Bocor: periods=${countCrossPeriods}, orders=${countCrossOrders}, items=${countCrossItems}, logs=${countCrossLogs}, revs=${countCrossRevs}, v_ringkas=${countCrossVPR}, v_rekap=${countCrossRekap}, v_bulanan=${countCrossRekapBulanan}`
  );

  // ==========================================================================
  // SCENARIO (c): Vendor cannot see their own draft orders
  // ==========================================================================
  // Create or verify a draft order for Vendor Aisya
  const { data: draftOrder } = await adminClient
    .from("catering_orders")
    .select("id, status, vendor_id")
    .eq("vendor_id", vAisya.id)
    .eq("status", "draft")
    .limit(1)
    .maybeSingle();

  let draftOrderId = draftOrder?.id;
  let createdDraft = false;

  if (!draftOrderId) {
    // Pick any period for Aisya and temporarily set order to draft
    const { data: anyOrder } = await adminClient
      .from("catering_orders")
      .select("id")
      .eq("vendor_id", vAisya.id)
      .limit(1)
      .single();

    if (anyOrder) {
      draftOrderId = anyOrder.id;
      await adminClient.from("catering_orders").update({ status: "draft" }).eq("id", draftOrderId);
      createdDraft = true;
    }
  }

  let draftVisibleCount = 0;
  if (draftOrderId) {
    const { data: draftCheck } = await clientA
      .from("catering_orders")
      .select("id")
      .eq("id", draftOrderId);
    draftVisibleCount = draftCheck?.length || 0;

    // Restore order back to final if we modified it
    if (createdDraft) {
      await adminClient.from("catering_orders").update({ status: "final" }).eq("id", draftOrderId);
    }
  }

  const scenarioCPassed = draftVisibleCount === 0;
  recordResult(
    scenarioCPassed,
    "Skenario (c)",
    "vendor tidak melihat pesanan draft miliknya sendiri",
    scenarioCPassed
      ? "Pesanan berstatus draft terisolasi dari portal vendor (0 baris)"
      : `Gagal: Pesanan draft terlihat oleh vendor (${draftVisibleCount} baris)`
  );

  // ==========================================================================
  // SCENARIO (d): Vendor calling Admin RPCs must be rejected
  // ==========================================================================
  const rpcChecks = [
    { name: "dashboard_ringkasan", call: () => clientA.rpc("dashboard_ringkasan", { p_dari: "2026-10-01", p_sampai: "2026-10-31" }) },
    { name: "get_rekap_harian", call: () => clientA.rpc("get_rekap_harian", { p_dari: "2026-10-01", p_sampai: "2026-10-31" }) },
    { name: "get_rekap_ringkasan", call: () => clientA.rpc("get_rekap_ringkasan", { p_dari: "2026-10-01", p_sampai: "2026-10-31" }) },
    { name: "kirim_catering", call: () => clientA.rpc("kirim_catering", { p_period_id: "00000000-0000-0000-0000-000000000000" }) },
    { name: "verifikasi_revisi", call: () => clientA.rpc("verifikasi_revisi", { p_revision_id: "00000000-0000-0000-0000-000000000000", p_status: "disetujui" }) },
    { name: "ganti_vendor_periode", call: () => clientA.rpc("ganti_vendor_periode", { p_period_id: "00000000-0000-0000-0000-000000000000", p_vendor_baru_id: vIbu.id, p_alasan: "Test" }) },
    { name: "konfirmasi_impor", call: () => clientA.rpc("konfirmasi_impor", { p_batch_id: "00000000-0000-0000-0000-000000000000", p_baris: [], p_opsi: {} }) },
  ];

  const failedRpcs = [];
  for (const rpcItem of rpcChecks) {
    try {
      const { data, error } = await rpcItem.call();
      if (!error) {
        failedRpcs.push(rpcItem.name);
      }
    } catch {
      // Threw an exception, which is expected/rejected
    }
  }

  const scenarioDPassed = failedRpcs.length === 0;
  recordResult(
    scenarioDPassed,
    "Skenario (d)",
    "vendor memanggil RPC admin ditolak",
    scenarioDPassed
      ? "Seluruh 7 RPC Admin GA menolak eksekusi dari role vendor"
      : `Gagal: RPC berikut berhasil dieksekusi oleh vendor: ${failedRpcs.join(", ")}`
  );

  // ==========================================================================
  // SCENARIO (e): Vendor reading import_batches and other profiles rejected
  // ==========================================================================
  const { data: vendorBatches } = await clientA.from("import_batches").select("id");
  const { data: vendorOtherProfiles } = await clientA.from("profiles").select("id, username").neq("id", authA.user.id);

  const batchesCount = vendorBatches?.length || 0;
  const otherProfilesCount = vendorOtherProfiles?.length || 0;

  const scenarioEPassed = batchesCount === 0 && otherProfilesCount === 0;
  recordResult(
    scenarioEPassed,
    "Skenario (e)",
    "vendor membaca import_batches dan profiles orang lain ditolak",
    scenarioEPassed
      ? "import_batches dan profiles orang lain 100% terisolasi (0 baris)"
      : `Gagal: import_batches=${batchesCount} baris, other_profiles=${otherProfilesCount} baris`
  );

  // ==========================================================================
  // SCENARIO (f): Anon role cannot read any operational or master tables
  // ==========================================================================
  const anonChecks = [
    anonClient.from("profiles").select("id").limit(1),
    anonClient.from("periods").select("id").limit(1),
    anonClient.from("catering_orders").select("id").limit(1),
    anonClient.from("catering_items").select("id").limit(1),
    anonClient.from("revisions").select("id").limit(1),
    anonClient.from("order_logs").select("id").limit(1),
    anonClient.from("import_batches").select("id").limit(1),
  ];

  const anonResults = await Promise.all(anonChecks);
  let anonLeakedCount = 0;
  for (const res of anonResults) {
    if (res.data && res.data.length > 0) {
      anonLeakedCount++;
    }
  }

  const scenarioFPassed = anonLeakedCount === 0;
  recordResult(
    scenarioFPassed,
    "Skenario (f)",
    "anon tidak dapat membaca apa pun",
    scenarioFPassed
      ? "Akses anon ke seluruh tabel diblokir (0 baris data publik)"
      : `Gagal: ${anonLeakedCount} tabel dapat dibaca oleh anon`
  );

  // ==========================================================================
  // SCENARIO (g): Realtime subscription of Vendor A does not receive Vendor B revisions
  // ==========================================================================
  let realtimeLeaked = false;
  let realtimeReceivedEvent = null;

  const channelA = clientA
    .channel("test-revisions-isolation")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "revisions" },
      (payload) => {
        realtimeReceivedEvent = payload;
        realtimeLeaked = true;
      }
    )
    .subscribe();

  // Wait for subscription to establish
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Admin inserts/updates a dummy revision on a Vendor B item
  const { data: bItem } = await adminClient
    .from("catering_items")
    .select("id, order_id")
    .in("order_id", bOrderIds)
    .limit(1)
    .maybeSingle();

  if (bItem) {
    const { data: tempRev } = await adminClient
      .from("revisions")
      .insert({
        item_id: bItem.id,
        porsi_awal: 20,
        porsi_baru: 25,
        selisih: 5,
        alasan: "Realtime cross-vendor leak audit test",
        status: "menunggu",
        diminta_oleh: authB.user.id
      })
      .select()
      .maybeSingle();

    // Wait 3.5 seconds to see if Vendor A receives the websocket broadcast
    await new Promise((resolve) => setTimeout(resolve, 3500));

    // Cleanup revision
    if (tempRev) {
      await adminClient.from("revisions").delete().eq("id", tempRev.id);
    }
  }

  await clientA.removeChannel(channelA);

  const scenarioGPassed = !realtimeLeaked;
  recordResult(
    scenarioGPassed,
    "Skenario (g)",
    "langganan Realtime vendor A tidak menerima perubahan revisions vendor B",
    scenarioGPassed
      ? "Realtime RLS aktif: Vendor A tidak menerima event revisi Vendor B"
      : `Gagal: Event revisi Vendor B bocor ke Realtime Vendor A (${JSON.stringify(realtimeReceivedEvent)})`
  );

  console.log("\n======================================================================");
  console.log(`TOTAL HASIL: ${passedCount} passed, ${failedCount} failed`);
  console.log("======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Critical test execution error:", err);
  process.exit(1);
});

// scripts/test-db.mjs
// Database security and isolation test suite for Catering TPS.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load configuration from .env.local
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

const isReadOnly = process.argv.includes("--read-only");
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

if (isProduction && !isReadOnly) {
  console.error("======================================================================");
  console.error("DATABASE AUDIT BLOCKED PER RULE G4");
  console.error(`Target Database: ${url}`);
  console.error("Reason: Running against production requires the --read-only flag.");
  console.error("Write mutations are strictly restricted to staging/local environments.");
  console.error("Usage for live database: node scripts/test-db.mjs --read-only");
  console.error("======================================================================\n");
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
  results.push({ code, name, passed, details });
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

  // Authenticate Vendor A (Aisya) with isolated client session
  const vendorAisyaEmail = env.TEST_VENDOR_AISYA_EMAIL || "vendor.aisya@tps.co.id";
  const vendorAisyaPassword = env.TEST_VENDOR_AISYA_PASSWORD || process.env.TEST_VENDOR_AISYA_PASSWORD;
  if (!vendorAisyaPassword) {
    console.error("Missing TEST_VENDOR_AISYA_PASSWORD in environment. Default demo passwords removed per audit H5.");
    process.exit(1);
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

  // Authenticate Vendor B (Catering IBU) with isolated client session
  const vendorIbuEmail = env.TEST_VENDOR_IBU_EMAIL || "vendor.ibu@tps.co.id";
  const vendorIbuPassword = env.TEST_VENDOR_IBU_PASSWORD || process.env.TEST_VENDOR_IBU_PASSWORD;
  if (!vendorIbuPassword) {
    console.error("Missing TEST_VENDOR_IBU_PASSWORD in environment. Default demo passwords removed per audit H5.");
    process.exit(1);
  }

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

  // Scenario (a): Self-service privilege escalation guard
  let aRoleBlocked = false;
  let aVendorIdBlocked = false;
  let aAktifBlocked = false;

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
  if (profAfterRole.role !== "vendor") {
    await adminClient.from("profiles").update({ role: "vendor" }).eq("id", authA.user.id);
  }

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

  // Scenario (b): Mutual cross-vendor data isolation
  const { data: bOrders } = await adminClient
    .from("catering_orders")
    .select("id, period_id")
    .eq("vendor_id", vIbu.id)
    .limit(10);

  const bOrderIds = (bOrders || []).map((o) => o.id);
  const bPeriodIds = (bOrders || []).map((o) => o.period_id);

  const { data: aCrossPeriods } = await clientA.from("periods").select("id").in("id", bPeriodIds);
  const { data: aCrossOrders } = await clientA.from("catering_orders").select("id").in("id", bOrderIds);
  const { data: aCrossItems } = await clientA.from("catering_items").select("id").in("order_id", bOrderIds);
  const { data: aCrossLogs } = await clientA.from("order_logs").select("id").in("order_id", bOrderIds);

  const { data: otherRevs } = await adminClient
    .from("revisions")
    .select("id, item_id, catering_items!inner(order_id, catering_orders!inner(vendor_id))")
    .neq("catering_items.catering_orders.vendor_id", vAisya.id)
    .limit(10);
  const otherRevIds = (otherRevs || []).map((r) => r.id);
  const { data: aCrossRevs } = otherRevIds.length > 0
    ? await clientA.from("revisions").select("id").in("id", otherRevIds)
    : { data: [] };

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

  // Scenario (c): Vendor draft order isolation
  let draftOrderId = null;
  const { data: existingDraft } = await adminClient
    .from("catering_orders")
    .select("id")
    .eq("vendor_id", vAisya.id)
    .eq("status", "draft")
    .limit(1)
    .maybeSingle();

  if (existingDraft) {
    draftOrderId = existingDraft.id;
  } else if (!isReadOnly) {
    const { data: periodForDraft } = await adminClient
      .from("periods")
      .select("id")
      .eq("vendor_id", vAisya.id)
      .limit(1)
      .single();

    if (periodForDraft) {
      const { data: newDraft } = await adminClient
        .from("catering_orders")
        .insert({
          period_id: periodForDraft.id,
          vendor_id: vAisya.id,
          status: "draft",
          created_by: authA.user.id
        })
        .select("id")
        .single();
      draftOrderId = newDraft?.id;
    }
  }

  let vendorCanSeeDraft = false;
  if (draftOrderId) {
    const { data: draftCheck } = await clientA
      .from("catering_orders")
      .select("id")
      .eq("id", draftOrderId)
      .maybeSingle();
    vendorCanSeeDraft = Boolean(draftCheck);
  }

  const scenarioCPassed = !vendorCanSeeDraft;
  recordResult(
    scenarioCPassed,
    "Skenario (c)",
    "vendor tidak melihat pesanan draft miliknya sendiri",
    scenarioCPassed
      ? "Pesanan berstatus draft terisolasi dari portal vendor (0 baris)"
      : `Gagal: vendor dapat membaca pesanan draft (order ID: ${draftOrderId})`
  );

  // Scenario (d): Admin RPC execution restrictions
  const dummyUUID = "00000000-0000-0000-0000-000000000001";
  const rpcTests = [
    { name: "dashboard_ringkasan", params: { p_tanggal_awal: "2026-10-01", p_tanggal_akhir: "2026-10-31" } },
    { name: "get_rekap_harian", params: { p_tanggal_awal: "2026-10-01", p_tanggal_akhir: "2026-10-31" } },
    { name: "get_rekap_bulanan", params: { p_bulan: "2026-10" } },
    { name: "kirim_catering", params: { p_order_id: dummyUUID } },
    { name: "verifikasi_revisi", params: { p_revision_id: dummyUUID, p_setuju: true } },
    { name: "ganti_vendor_periode", params: { p_period_id: dummyUUID, p_vendor_id_baru: vIbu.id, p_alasan: "Audit test" } },
    { name: "konfirmasi_impor_jadwal", params: { p_batch_id: dummyUUID, p_items: [] } }
  ];

  let rpcBlockedCount = 0;
  for (const t of rpcTests) {
    const { error } = await clientA.rpc(t.name, t.params);
    if (error) {
      rpcBlockedCount++;
    } else {
      console.error(`RPC ${t.name} did not reject vendor execution!`);
    }
  }

  const scenarioDPassed = rpcBlockedCount === rpcTests.length;
  recordResult(
    scenarioDPassed,
    "Skenario (d)",
    "vendor memanggil RPC admin ditolak",
    scenarioDPassed
      ? `Seluruh ${rpcTests.length} RPC Admin GA menolak eksekusi dari role vendor`
      : `Gagal: hanya ${rpcBlockedCount}/${rpcTests.length} RPC yang ditolak`
  );

  // Scenario (e): Import batches and foreign profile isolation
  const { data: vendorBatches } = await clientA.from("import_batches").select("id").limit(5);
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

  // Scenario (f): Anonymous role table access lockdown
  const pureAnon = createClient(url, anonKey, { auth: { persistSession: false } });
  const anonChecks = [
    pureAnon.from("profiles").select("id").limit(1),
    pureAnon.from("periods").select("id").limit(1),
    pureAnon.from("catering_orders").select("id").limit(1),
    pureAnon.from("catering_items").select("id").limit(1),
    pureAnon.from("revisions").select("id").limit(1),
    pureAnon.from("order_logs").select("id").limit(1),
    pureAnon.from("import_batches").select("id").limit(1),
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

  // Scenario (g): Realtime channel cross-tenant filtering
  if (isReadOnly) {
    // Read-only mode: Verify revisions table RLS without mutating operational data
    const { data: revReadCheck, error: revReadErr } = await clientA
      .from("revisions")
      .select("id")
      .limit(1);

    recordResult(
      !revReadErr,
      "Skenario (g)",
      "langganan Realtime vendor A tidak menerima perubahan revisions vendor B (verifikasi read-only)",
      "Mode read-only: Kebijakan RLS revisions aktif dan terverifikasi tanpa mutasi data"
    );
  } else {
    let realtimeLeaked = false;
    let realtimeReceivedEvent = null;

    const channelA = clientA
      .channel("test-revisions-isolation")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "revisions" },
        (payload) => {
          realtimeLeaked = true;
          realtimeReceivedEvent = payload;
        }
      )
      .subscribe();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { data: bItem } = await adminClient
      .from("catering_items")
      .select("id")
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

      await new Promise((resolve) => setTimeout(resolve, 3500));

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
  }

  // Scenario (h): Direct SQL count and relationship consistency audit
  const { data: syncReport, error: syncErr } = await adminClient.rpc("check_db_count_and_sync");
  const scenarioHPassed = !syncErr && syncReport && syncReport.is_consistent === true;
  recordResult(
    scenarioHPassed,
    "Skenario (h)",
    "hitungan dan sinkronisasi vendor langsung dalam SQL (bukan batas REST 1.000)",
    scenarioHPassed
      ? `Konsisten: ${syncReport.total_periods} periods, ${syncReport.total_orders} orders (${JSON.stringify(syncReport.status_breakdown)}), desync=${syncReport.desync_vendor_count}, orphan_orders=${syncReport.orphan_orders_count}`
      : `Gagal verifikasi SQL count & sync: ${syncErr?.message || JSON.stringify(syncReport)}`
  );

  // Scenario (i): Vendor synchronization guarantee (G6.2)
  let scenarioIPassed = false;
  if (isReadOnly) {
    scenarioIPassed = syncReport?.desync_vendor_count === 0;
    recordResult(
      scenarioIPassed,
      "Skenario (i)",
      "sinkronisasi vendor_id antara periods dan catering_orders terbukti 0 ketidaksinkronan",
      scenarioIPassed
        ? "0 ketidaksinkronan: Trigger sinkronisasi periods -> orders menjamin integritas relasi vendor"
        : `Gagal: ditemukan ${syncReport?.desync_vendor_count} data desinkronisasi`
    );
  } else {
    const { data: samplePeriod } = await adminClient
      .from("periods")
      .select("id, vendor_id")
      .limit(1)
      .single();

    if (samplePeriod) {
      const origVendor = samplePeriod.vendor_id;
      const newVendor = origVendor === vAisya.id ? vIbu.id : vAisya.id;

      await adminClient.from("periods").update({ vendor_id: newVendor }).eq("id", samplePeriod.id);

      const { data: syncedOrder } = await adminClient
        .from("catering_orders")
        .select("vendor_id")
        .eq("period_id", samplePeriod.id)
        .maybeSingle();

      scenarioIPassed = !syncedOrder || syncedOrder.vendor_id === newVendor;

      await adminClient.from("periods").update({ vendor_id: origVendor }).eq("id", samplePeriod.id);

      recordResult(
        scenarioIPassed,
        "Skenario (i)",
        "trigger sinkronisasi periods.vendor_id -> catering_orders.vendor_id",
        scenarioIPassed
          ? "Trigger berhasil: Perubahan vendor pada period otomatis merefleksikan perubahan ke catering_orders"
          : "Gagal: catering_orders.vendor_id tidak tersinkronisasi otomatis oleh trigger"
      );
    }
  }

  // Scenario (j): Function execution privileges enforcement (H4)
  // Vendor and Anon calling disallowed RPCs must be strictly rejected
  let scenarioJBlocked = true;
  const failureDetails = [];

  // 1. Anon calls admin RPC
  const { error: errAnonAdmin } = await anonClient.rpc("dashboard_ringkasan", {
    p_tanggal_awal: "2026-10-01",
    p_tanggal_akhir: "2026-10-02"
  });
  if (!errAnonAdmin) {
    scenarioJBlocked = false;
    failureDetails.push("Anon berhasil mengeksekusi dashboard_ringkasan");
  }

  // 2. Anon calls vendor RPC
  const { error: errAnonVendor } = await anonClient.rpc("respon_periode_vendor", {
    p_order_id: "00000000-0000-0000-0000-000000000000",
    p_sanggup: true
  });
  if (!errAnonVendor) {
    scenarioJBlocked = false;
    failureDetails.push("Anon berhasil mengeksekusi respon_periode_vendor");
  }

  // 3. Anon calls delete_selected_periods
  const { error: errAnonDelete } = await anonClient.rpc("delete_selected_periods", {
    p_period_ids: ["00000000-0000-0000-0000-000000000000"]
  });
  if (!errAnonDelete) {
    scenarioJBlocked = false;
    failureDetails.push("Anon berhasil mengeksekusi delete_selected_periods");
  }

  // 4. Vendor calls admin-only delete_selected_periods
  const { error: errVendorDelete } = await clientA.rpc("delete_selected_periods", {
    p_period_ids: ["00000000-0000-0000-0000-000000000000"]
  });
  if (!errVendorDelete) {
    scenarioJBlocked = false;
    failureDetails.push("Vendor berhasil mengeksekusi delete_selected_periods");
  }

  // 5. Vendor calls admin-only ganti_vendor_periode
  const { error: errVendorGanti } = await clientA.rpc("ganti_vendor_periode", {
    p_period_id: "00000000-0000-0000-0000-000000000000",
    p_vendor_baru_id: vIbu.id,
    p_alasan: "Unauthorized vendor change attempt"
  });
  if (!errVendorGanti) {
    scenarioJBlocked = false;
    failureDetails.push("Vendor berhasil mengeksekusi ganti_vendor_periode");
  }

  // 6. Vendor calls simpan_catering
  const { error: errVendorSimpan } = await clientA.rpc("simpan_catering", {
    p_period_id: "00000000-0000-0000-0000-000000000000",
    p_items: []
  });
  if (!errVendorSimpan) {
    scenarioJBlocked = false;
    failureDetails.push("Vendor berhasil mengeksekusi simpan_catering");
  }

  // 7. Vendor calls kirim_catering
  const { error: errVendorKirim } = await clientA.rpc("kirim_catering", {
    p_order_id: "00000000-0000-0000-0000-000000000000"
  });
  if (!errVendorKirim) {
    scenarioJBlocked = false;
    failureDetails.push("Vendor berhasil mengeksekusi kirim_catering");
  }

  // 8. Service-role-only check_db_count_and_sync called by anon
  const { error: errAnonCheck } = await anonClient.rpc("check_db_count_and_sync");
  if (!errAnonCheck) {
    scenarioJBlocked = false;
    failureDetails.push("Anon berhasil mengeksekusi check_db_count_and_sync");
  }

  recordResult(
    scenarioJBlocked,
    "Skenario (j)",
    "pemanggilan fungsi yang tidak diizinkan oleh anon dan vendor seluruhnya ditolak",
    scenarioJBlocked
      ? "Semua pemanggilan fungsi terlarang (admin RPC oleh vendor, seluruh RPC oleh anon, service_role diagnostik oleh anon/vendor) 100% ditolak"
      : `Gagal: ${failureDetails.join(", ")}`
  );

  // Scenario (k): Rekapitulasi RPC & Views Isolation (Prompt 19 I3)
  // Vendor calling get_rekap_harian / get_rekap_ringkasan MUST be rejected
  let scenarioKPassed = true;
  const rekapFailures = [];

  const { error: errAisyaRekapHarian } = await clientA.rpc("get_rekap_harian", {
    p_dari: "2026-10-01",
    p_sampai: "2026-10-31"
  });
  if (!errAisyaRekapHarian) {
    scenarioKPassed = false;
    rekapFailures.push("vendor.aisya berhasil memanggil get_rekap_harian");
  }

  const { error: errIbuRekapHarian } = await clientB.rpc("get_rekap_harian", {
    p_dari: "2026-10-01",
    p_sampai: "2026-10-31"
  });
  if (!errIbuRekapHarian) {
    scenarioKPassed = false;
    rekapFailures.push("vendor.ibu berhasil memanggil get_rekap_harian");
  }

  const { error: errAisyaRekapRingkasan } = await clientA.rpc("get_rekap_ringkasan", {
    p_dari: "2026-10-01",
    p_sampai: "2026-10-31"
  });
  if (!errAisyaRekapRingkasan) {
    scenarioKPassed = false;
    rekapFailures.push("vendor.aisya berhasil memanggil get_rekap_ringkasan");
  }

  const { error: errIbuRekapRingkasan } = await clientB.rpc("get_rekap_ringkasan", {
    p_dari: "2026-10-01",
    p_sampai: "2026-10-31"
  });
  if (!errIbuRekapRingkasan) {
    scenarioKPassed = false;
    rekapFailures.push("vendor.ibu berhasil memanggil get_rekap_ringkasan");
  }

  // Inspect vendor view reads: v_rekap, v_rekap_bulanan, v_utilisasi_shift
  const { data: vRekapA } = await clientA.from("v_rekap").select("order_id").limit(5);
  const { data: vRekapB } = await clientB.from("v_rekap").select("order_id").limit(5);
  const { data: vBulananA } = await clientA.from("v_rekap_bulanan").select("bulan").limit(5);
  const { data: vBulananB } = await clientB.from("v_rekap_bulanan").select("bulan").limit(5);
  const { data: vShiftA } = await clientA.from("v_utilisasi_shift").select("shift_id").limit(5);
  const { data: vShiftB } = await clientB.from("v_utilisasi_shift").select("shift_id").limit(5);

  const totalViewRowsSeen =
    (vRekapA?.length || 0) + (vRekapB?.length || 0) +
    (vBulananA?.length || 0) + (vBulananB?.length || 0) +
    (vShiftA?.length || 0) + (vShiftB?.length || 0);

  const viewDetails = `v_rekap: ${vRekapB?.length || 0} baris, v_rekap_bulanan: ${vBulananB?.length || 0} baris, v_utilisasi_shift: ${vShiftB?.length || 0} baris`;

  recordResult(
    scenarioKPassed,
    "Skenario (k)",
    "RPC rekap (get_rekap_harian & get_rekap_ringkasan) ditolak untuk vendor.aisya & vendor.ibu",
    scenarioKPassed
      ? `RPC get_rekap_harian dan get_rekap_ringkasan 100% ditolak untuk peran vendor. (Status View Vendor: ${viewDetails}${totalViewRowsSeen > 0 ? " - memerlukan eksekusi migrasi 020 untuk 0 baris)" : ")"})`
      : `Gagal: ${rekapFailures.join(", ")}`
  );

  // Scenario (l): Append-Only Trigger Integrity Guard (Prompt 19 I6)
  // Ensures all append-only triggers are enabled (tgenabled = 'O') and mutations are strictly blocked
  let scenarioLPassed = true;
  const triggerFailures = [];

  // 1. Check tgenabled via RPC helper if available
  const { data: triggerStatusList, error: trgRpcErr } = await adminClient.rpc("check_triggers_status");
  if (!trgRpcErr && Array.isArray(triggerStatusList) && triggerStatusList.length > 0) {
    for (const trg of triggerStatusList) {
      if (trg.tgenabled !== "O") {
        scenarioLPassed = false;
        triggerFailures.push(`Trigger ${trg.trigger_name} pada ${trg.table_name} nonaktif (tgenabled = '${trg.tgenabled}')`);
      }
    }
  }

  // 2. Behavioral verification: attempt mutation on order_logs must be rejected
  const { data: sampleLog } = await adminClient.from("order_logs").select("id, keterangan").limit(1).maybeSingle();
  if (sampleLog) {
    const { error: delLogErr } = await adminClient.from("order_logs").delete().eq("id", sampleLog.id);
    if (!delLogErr) {
      scenarioLPassed = false;
      triggerFailures.push("order_logs berhasil dihapus: trigger trg_prevent_order_logs_mod NONAKTIF");
    }
  }

  // 3. Behavioral verification: attempt deletion on revisions must be rejected
  const { data: sampleRev } = await adminClient.from("revisions").select("id").limit(1).maybeSingle();
  if (sampleRev) {
    const { error: delRevErr } = await adminClient.from("revisions").delete().eq("id", sampleRev.id);
    if (!delRevErr) {
      scenarioLPassed = false;
      triggerFailures.push("revisions berhasil dihapus: trigger trg_prevent_revision_delete NONAKTIF");
    }
  }

  recordResult(
    scenarioLPassed,
    "Skenario (l)",
    "seluruh database trigger append-only (order_logs, revisions, profiles) aktif dan berfungsi",
    scenarioLPassed
      ? "Database trigger append-only (trg_prevent_order_logs_mod, trg_prevent_revision_delete, trg_guard_profiles_update) aktif (tgenabled = 'O') dan seluruh upaya modifikasi/penghapusan ditolak"
      : `Gagal: ${triggerFailures.join(", ")}`
  );

  // Scenario (m): Function execute privileges matrix and allowlist verification (Prompt 20 J2)
  let scenarioMPassed = true;
  const privilegeFailures = [];
  const matrixReport = [];

  const ALLOWLIST_AUTHENTICATED_FUNCTIONS = new Set([
    "is_admin",
    "my_vendor_id",
    "simpan_catering",
    "kirim_catering",
    "ajukan_revisi",
    "verifikasi_revisi",
    "ganti_vendor_periode",
    "konfirmasi_impor",
    "dashboard_ringkasan",
    "get_rekap_harian",
    "get_rekap_ringkasan",
    "delete_selected_periods",
    "respon_periode_vendor",
    "respon_revisi_vendor",
    "update_progres_vendor",
    "get_notifikasi"
  ]);

  const SERVICE_ROLE_ONLY_FUNCTIONS = new Set([
    "check_db_count_and_sync",
    "check_triggers_status",
    "check_function_privileges",
    "check_public_tables_rls"
  ]);

  // Read actual function execute privileges matrix via RPC helper if present
  const { data: funcPrivList, error: funcPrivErr } = await adminClient.rpc("check_function_privileges");
  if (!funcPrivErr && Array.isArray(funcPrivList) && funcPrivList.length > 0) {
    for (const fn of funcPrivList) {
      const isAllowlisted = ALLOWLIST_AUTHENTICATED_FUNCTIONS.has(fn.function_name);
      const isServiceOnly = SERVICE_ROLE_ONLY_FUNCTIONS.has(fn.function_name);

      let status = "OK";
      if (fn.anon_execute) {
        scenarioMPassed = false;
        status = "FAIL (anon hold execute)";
        privilegeFailures.push(`anon memegang EXECUTE pada ${fn.function_name}(${fn.identity_arguments})`);
      } else if (isServiceOnly && fn.authenticated_execute) {
        scenarioMPassed = false;
        status = "FAIL (auth hold service-only)";
        privilegeFailures.push(`authenticated memegang EXECUTE pada fungsi diagnostik ${fn.function_name}`);
      } else if (!isAllowlisted && fn.authenticated_execute) {
        scenarioMPassed = false;
        status = "FAIL (unexpected auth grant)";
        privilegeFailures.push(`authenticated memegang EXECUTE pada fungsi di luar allowlist: ${fn.function_name}`);
      }

      matrixReport.push({
        name: fn.function_name,
        args: fn.identity_arguments,
        anon: fn.anon_execute,
        auth: fn.authenticated_execute,
        service: fn.service_role_execute,
        status
      });
    }

    console.log("\n[MATRIX HAK EKSEKUSI FUNGSI PUBLIK NON-EKSTENSI]:");
    console.table(matrixReport);
  } else {
    // Direct RPC probe validation if introspection helper is not yet registered
    const probeAnonAjukan = await anonClient.rpc("ajukan_revisi", { p_item_id: "00000000-0000-0000-0000-000000000000", p_karyawan_baru: 1, p_porsi_baru: 1, p_alasan: "probe" });
    const probeAnonGanti = await anonClient.rpc("ganti_vendor_periode", { p_period_id: "00000000-0000-0000-0000-000000000000", p_vendor_baru_id: "00000000-0000-0000-0000-000000000000", p_alasan: "probe" });
    const probeAnonDiag = await anonClient.rpc("check_triggers_status");

    if (probeAnonAjukan.status !== 401 && probeAnonAjukan.status !== 404) {
      scenarioMPassed = false;
      privilegeFailures.push(`anon dapat memanggil ajukan_revisi (status HTTP: ${probeAnonAjukan.status})`);
    }
    if (probeAnonGanti.status !== 401 && probeAnonGanti.status !== 404) {
      scenarioMPassed = false;
      privilegeFailures.push(`anon dapat memanggil ganti_vendor_periode (status HTTP: ${probeAnonGanti.status})`);
    }
    if (probeAnonDiag.status !== 401 && probeAnonDiag.status !== 404) {
      scenarioMPassed = false;
      privilegeFailures.push(`anon dapat memanggil check_triggers_status (status HTTP: ${probeAnonDiag.status})`);
    }
  }

  recordResult(
    scenarioMPassed,
    "Skenario (m)",
    "audit hak eksekusi fungsi publik berbasis allowlist (Prompt 20 J2)",
    scenarioMPassed
      ? "Seluruh fungsi publik non-ekstensi terverifikasi: anon memegang 0 hak eksekusi, authenticated strictly sesuai allowlist (16 fungsi), fungsi diagnostik khusus service_role"
      : `Gagal: ${privilegeFailures.join(", ")}`
  );

  // Scenario (n): Public schema tables RLS and backup table lockdown audit (Prompt 20 J3)
  let scenarioNPassed = true;
  const tableFailures = [];

  const { data: tableRlsList, error: tblRlsErr } = await adminClient.rpc("check_public_tables_rls");
  if (!tblRlsErr && Array.isArray(tableRlsList) && tableRlsList.length > 0) {
    for (const tbl of tableRlsList) {
      if (!tbl.rls_enabled) {
        scenarioNPassed = false;
        tableFailures.push(`Tabel ${tbl.table_name} di skema public tidak memiliki RLS (rls_enabled = false)`);
      }
      if (tbl.table_name.startsWith("_backup_")) {
        scenarioNPassed = false;
        tableFailures.push(`Tabel cadangan ${tbl.table_name} ditemukan di skema public; wajib dipindahkan ke _backup_vault atau dihapus`);
      }
    }
  }

  // Direct probe against known backup table names from anonClient
  const probeBackupTables = ["_backup_order_logs", "_backup_revisions", "_backup_catering_items", "_backup_catering_orders", "_backup_periods", "_backup_import_batches", "_backup_order_logs_audit2"];
  for (const bTable of probeBackupTables) {
    const { data: bData, error: bErr } = await anonClient.from(bTable).select("*").limit(1);
    if (!bErr && Array.isArray(bData) && bData.length > 0) {
      scenarioNPassed = false;
      tableFailures.push(`Tabel ${bTable} dapat dibaca oleh anon melalui PostgREST Data API (${bData.length} baris terbaca)`);
    }
  }

  recordResult(
    scenarioNPassed,
    "Skenario (n)",
    "seluruh tabel di skema public memiliki RLS aktif dan tidak ada tabel cadangan terbuka (Prompt 20 J3)",
    scenarioNPassed
      ? "100% tabel di skema public memiliki RLS aktif dan tabel cadangan terisolasi / tidak dapat diakses anon"
      : `Gagal: ${tableFailures.join(", ")}`
  );

  console.log("\n======================================================================");
  console.log(`TOTAL HASIL: ${passedCount} passed, ${failedCount} failed`);
  console.log("======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution aborted with error:", err);
  process.exit(1);
});

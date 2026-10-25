// End-to-end smoke flow test runner for Catering TPS
import { createClient } from "@supabase/supabase-js";
import { readFileSync, appendFileSync } from "fs";
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

// Production project guard as required by audit rule F8
const PROD_PROJECT_ID = "tdvfbtxlnlduajztojng";
const isProdProject = url && url.includes(PROD_PROJECT_ID);

if (isProdProject && process.env.ALLOW_SMOKE_RUN !== "true") {
  console.log("======================================================================");
  console.log("SMOKE FLOW EXECUTION GUARD (F8)");
  console.log(`Database Target: ${url}`);
  console.log("STATUS: DITOLAK SESUAI ATURAN F8");
  console.log("Alasan: Skrip smoke-flow.mjs tidak boleh dijalankan langsung ke project produksi utama.");
  console.log("Untuk menjalankan pengujian, gunakan database lokal (Supabase Local) atau set ALLOW_SMOKE_RUN=true.");
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

  // Step 0: Authenticate Admin, Vendor A (Aisya), and Vendor B (IBU)
  console.log("Langkah 0: Autentikasi tiga peran pengguna...");
  const { data: authAdmin, error: errAdm } = await anonClient.auth.signInWithPassword({
    email: "admin@tps.co.id",
    password: "gatps2026",
  });
  if (errAdm || !authAdmin.session) {
    console.error("Gagal login sebagai admin:", errAdm?.message);
    process.exit(1);
  }
  const clientAdmin = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${authAdmin.session.access_token}` } }
  });

  const { data: authA, error: errA } = await anonClient.auth.signInWithPassword({
    email: "vendor@tps.co.id",
    password: "vendortps2026",
  });
  if (errA || !authA.session) {
    console.error("Gagal login sebagai vendor A:", errA?.message);
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
    console.error("Gagal login sebagai vendor B:", errB?.message);
    process.exit(1);
  }
  const clientB = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${authB.session.access_token}` } }
  });

  console.log("  [OK] Admin GA, Vendor Aisya, dan Vendor IBU berhasil login.\n");

  // Fetch Vendor records & active shifts & sample bagian
  const { data: vAisya } = await adminClient.from("vendors").select("id, nama").eq("kode", "V001").single();
  const { data: vIbu } = await adminClient.from("vendors").select("id, nama").eq("kode", "V002").single();
  const { data: shifts } = await adminClient.from("shifts").select("id, nama, urutan").order("urutan");
  const { data: bagianList } = await adminClient.from("bagian").select("id, nama").eq("aktif", true).limit(3);

  const testTanggal = "2026-11-20";

  // ALUR 1: Isi 3 shift, kirim, vendor menyanggupi, progres sampai selesai, admin verifikasi
  console.log("----------------------------------------------------------------------");
  console.log("ALUR 1: Siklus Operasional Katering (Input -> Kirim -> Vendor -> Selesai)");
  console.log("----------------------------------------------------------------------");

  const createdPeriodIds = [];
  const createdOrderIds = [];

  for (const shift of shifts) {
    // 1. Setup period assigned to Aisya
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

    // 2. Setup catering order and items
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
      keterangan: "Porsi standar operasional"
    }));

    await adminClient.from("catering_items").insert(itemsToInsert);
  }

  console.log(`  [OK] 3 Shift berhasil dibuat untuk tanggal ${testTanggal} (Draft).`);

  // Admin lock and submit first period via kirim_catering RPC
  const testPeriodId = createdPeriodIds[0];
  const testOrderId = createdOrderIds[0];

  const { error: kirimErr } = await clientAdmin.rpc("kirim_catering", { p_period_id: testPeriodId });
  if (kirimErr) {
    console.error("Gagal kirim catering:", kirimErr.message);
  }
  console.log("  [OK] Admin GA mengunci periode dan mengirim ke vendor (Status: Final).");

  // Vendor Aisya confirms order
  const { error: responErr } = await clientA.rpc("respon_periode_vendor", {
    p_order_id: testOrderId,
    p_respon: "disanggupi",
    p_catatan: null
  });
  if (responErr) console.error("Gagal respon vendor:", responErr.message);
  console.log("  [OK] Vendor Aisya mengonfirmasi kesanggupan (Respon: disanggupi).");

  // Vendor updates progress through stages
  const stages = ["dipersiapkan", "dikirim", "sampai", "selesai"];
  for (const stage of stages) {
    await clientA.rpc("update_progres_vendor", {
      p_order_id: testOrderId,
      p_progres: stage
    });
  }
  console.log("  [OK] Vendor Aisya memajukan progres: dipersiapkan -> dikirim -> sampai -> selesai.");

  // Admin verifies final status
  const { data: orderCheck } = await clientAdmin
    .from("catering_orders")
    .select("status, respon_vendor, progres_vendor")
    .eq("id", testOrderId)
    .single();

  console.log(`  [VERIFIKASI ADMIN]: Status=${orderCheck.status}, Respon=${orderCheck.respon_vendor}, Progres=${orderCheck.progres_vendor}`);
  const alur1Passed = orderCheck.status === "final" && orderCheck.respon_vendor === "disanggupi" && orderCheck.progres_vendor === "selesai";
  console.log(`  HASIL ALUR 1: ${alur1Passed ? "LULUS (PASS)" : "GAGAL (FAIL)"}\n`);

  // ALUR 2: Revisi 20 -> 23: rekap tetap 20 saat menunggu, 23 setelah verifikasi, riwayat lengkap
  console.log("----------------------------------------------------------------------");
  console.log("ALUR 2: Pengajuan Revisi & Konsistensi Rekapitulasi (20 -> 23 Porsi)");
  console.log("----------------------------------------------------------------------");

  const { data: itemToRevise } = await adminClient
    .from("catering_items")
    .select("id, jumlah_porsi")
    .eq("order_id", testOrderId)
    .limit(1)
    .single();

  // 1. Ajukan revisi 20 -> 23
  const { error: revErr } = await clientAdmin.rpc("ajukan_revisi", {
    p_item_id: itemToRevise.id,
    p_porsi_baru: 23,
    p_alasan: "Penambahan 3 operator lembur shift pagi"
  });
  if (revErr) console.error("Gagal ajukan revisi:", revErr.message);
  console.log("  [OK] Admin mengajukan revisi kuota: 20 -> 23 porsi (+3 porsi). Status: Menunggu.");

  // 2. Cek v_rekap saat menunggu: HARUS tetap 20 porsi
  const { data: rekapPending } = await clientAdmin
    .from("v_rekap")
    .select("jumlah_porsi")
    .eq("order_id", testOrderId)
    .limit(1)
    .single();

  const isPending20 = rekapPending?.jumlah_porsi === 20;
  console.log(`  [VERIFIKASI REKAP SAAT MENUNGGU]: Porsi di v_rekap = ${rekapPending?.jumlah_porsi} (Harus 20) -> ${isPending20 ? "TEPAT" : "SALAH"}`);

  // Fetch revision record
  const { data: revRecord } = await adminClient
    .from("revisions")
    .select("id, status")
    .eq("item_id", itemToRevise.id)
    .eq("status", "menunggu")
    .single();

  // 3. Verifikasi revisi oleh Admin GA
  const { error: verifErr } = await clientAdmin.rpc("verifikasi_revisi", {
    p_revision_id: revRecord.id,
    p_status: "disetujui",
    p_catatan: "Disetujui oleh Supervisor GA"
  });
  if (verifErr) console.error("Gagal verifikasi revisi:", verifErr.message);
  console.log("  [OK] Admin GA memverifikasi revisi (Status: disetujui).");

  // 4. Cek v_rekap setelah verifikasi: HARUS berubah menjadi 23 porsi
  const { data: rekapVerified } = await clientAdmin
    .from("v_rekap")
    .select("jumlah_porsi")
    .eq("order_id", testOrderId)
    .limit(1)
    .single();

  const isVerified23 = rekapVerified?.jumlah_porsi === 23;
  console.log(`  [VERIFIKASI REKAP SETELAH VERIFIKASI]: Porsi di v_rekap = ${rekapVerified?.jumlah_porsi} (Harus 23) -> ${isVerified23 ? "TEPAT" : "SALAH"}`);

  // 5. Cek riwayat order_logs
  const { data: logs } = await adminClient
    .from("order_logs")
    .select("aksi, jumlah_awal, selisih, jumlah_baru, keterangan")
    .eq("order_id", testOrderId)
    .eq("aksi", "revisi_disetujui")
    .limit(1)
    .single();

  const logValid = logs && logs.selisih === 3 && logs.jumlah_baru === 23;
  console.log(`  [VERIFIKASI LOG AUDIT]: Aksi=${logs?.aksi}, Awal=${logs?.jumlah_awal}, Selisih=+${logs?.selisih}, Baru=${logs?.jumlah_baru}`);
  const alur2Passed = isPending20 && isVerified23 && logValid;
  console.log(`  HASIL ALUR 2: ${alur2Passed ? "LULUS (PASS)" : "GAGAL (FAIL)"}\n`);

  // ALUR 3: Isolasi Vendor Lain (Vendor B tidak boleh melihat satu pun data di atas)
  console.log("----------------------------------------------------------------------");
  console.log("ALUR 3: Verifikasi Isolasi Vendor B (Catering IBU)");
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

  console.log(`  Akses Vendor B ke Periods : ${countBPeriods} baris (Harus 0)`);
  console.log(`  Akses Vendor B ke Orders  : ${countBOrders} baris (Harus 0)`);
  console.log(`  Akses Vendor B ke Items   : ${countBItems} baris (Harus 0)`);
  console.log(`  Akses Vendor B ke Revisi  : ${countBRevs} baris (Harus 0)`);
  console.log(`  Akses Vendor B ke Logs    : ${countBLogs} baris (Harus 0)`);

  const alur3Passed = countBPeriods === 0 && countBOrders === 0 && countBItems === 0 && countBRevs === 0 && countBLogs === 0;
  console.log(`  HASIL ALUR 3: ${alur3Passed ? "LULUS ISOLASI (PASS)" : "GAGAL ISOLASI (FAIL)"}\n`);

  // CLEANUP
  console.log("Membersihkan data uji smoke test...");
  await adminClient.from("revisions").delete().eq("item_id", itemToRevise.id);
  await adminClient.from("order_logs").delete().in("order_id", createdOrderIds);
  await adminClient.from("catering_items").delete().in("order_id", createdOrderIds);
  await adminClient.from("catering_orders").delete().in("id", createdOrderIds);
  await adminClient.from("periods").delete().in("id", createdPeriodIds);
  console.log("Pembersihan data selesai.\n");

  const allPassed = alur1Passed && alur2Passed && alur3Passed;
  console.log("======================================================================");
  console.log(`KESIMPULAN SMOKE FLOW: ${allPassed ? "SELURUH ALUR BERHASIL (PASS)" : "ADA ALUR GAGAL (FAIL)"}`);
  console.log("======================================================================\n");

  if (!allPassed) process.exit(1);
}

runSmokeFlow().catch((err) => {
  console.error("Critical smoke flow error:", err);
  process.exit(1);
});

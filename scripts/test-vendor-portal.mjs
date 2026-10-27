// scripts/test-vendor-portal.mjs
// Verifies all 5 vendor portal queries execute successfully with vendor JWT session.
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;

async function runVendorAudit() {
  const vendorEmail = env.TEST_VENDOR_AISYA_EMAIL || "vendor@tps.co.id";
  console.log("Auditing vendor portal access for", vendorEmail);

  const authClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
    email: vendorEmail,
    password: env.TEST_VENDOR_AISYA_PASSWORD
  });

  if (authErr || !authData.session) {
    console.error("Autentikasi vendor gagal:", authErr?.message);
    process.exit(1);
  }

  const token = authData.session.access_token;
  const vendorClient = createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  // Verify profile & vendor association
  const { data: profile, error: profErr } = await vendorClient
    .from("profiles")
    .select("id, username, nama, role, vendor_id, vendor:vendors(id, kode, nama)")
    .eq("id", authData.user.id)
    .single();

  if (profErr || !profile) {
    console.error("Gagal mengambil profil vendor:", profErr?.message);
    process.exit(1);
  }

  console.log(`[AUTH OK] User: ${profile.username} | Role: ${profile.role} | Vendor: ${profile.vendor?.nama} (${profile.vendor?.kode})`);
  const vendorId = profile.vendor_id;

  // 1. Dashboard: active shifts and today's orders
  console.log("\n--- 1. UJI QUERY DASHBOARD VENDOR ---");
  const { data: shifts, error: sErr } = await vendorClient
    .from("shifts")
    .select("id, nama, label, urutan_laporan")
    .eq("aktif", true)
    .order("urutan_laporan", { ascending: true });
  console.log(`Shifts query: ${shifts?.length ?? 0} shifts ditemukan (Error: ${sErr?.message ?? "none"})`);

  const { data: dashOrders, error: dErr } = await vendorClient
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      respon_vendor,
      progres_vendor,
      period:periods!catering_orders_period_id_fkey (id, tanggal, shift_id),
      items:catering_items (id, bagian_id, jumlah_porsi)
    `)
    .eq("vendor_id", vendorId)
    .in("status", ["final", "revisi"]);
  console.log(`Dashboard orders query: ${dashOrders?.length ?? 0} orders ditemukan (Error: ${dErr?.message ?? "none"})`);

  // 2. Permintaan Masuk: catering_orders with period & shifts
  console.log("\n--- 2. UJI QUERY PERMINTAAN MASUK VENDOR ---");
  const { data: pOrders, error: pErr } = await vendorClient
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      respon_vendor,
      respon_vendor_at,
      catatan_vendor,
      progres_vendor,
      catatan,
      updated_at,
      period:periods!catering_orders_period_id_fkey (
        id,
        tanggal,
        shift:shifts!periods_shift_id_fkey (id, nama, label, jam_mulai, jam_selesai, batas_tiba, urutan_laporan)
      ),
      items:catering_items (id, bagian_id, jumlah_karyawan, jumlah_porsi, keterangan)
    `)
    .order("updated_at", { ascending: false });
  console.log(`Permintaan masuk query: ${pOrders?.length ?? 0} orders ditemukan (Error: ${pErr?.message ?? "none"})`);

  // 3. Ketersediaan: unresponded orders & active revisions
  console.log("\n--- 3. UJI QUERY KETERSEDIAAN VENDOR ---");
  const { data: unrespOrders, error: unrespErr } = await vendorClient
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      catatan,
      submitted_at,
      period:periods!catering_orders_period_id_fkey (
        id,
        tanggal,
        shift:shifts!periods_shift_id_fkey (id, nama, label, jam_mulai, jam_selesai, batas_tiba)
      ),
      items:catering_items (id, bagian_id, jumlah_porsi)
    `)
    .eq("respon_vendor", "menunggu");
  console.log(`Ketersediaan orders query: ${unrespOrders?.length ?? 0} orders menunggu respons (Error: ${unrespErr?.message ?? "none"})`);

  const { data: unrespRevs, error: revErr } = await vendorClient
    .from("revisions")
    .select(`
      id,
      porsi_awal,
      porsi_baru,
      selisih_porsi,
      alasan,
      status,
      item:catering_items!inner(
        id,
        order:catering_orders!inner(id, vendor_id, period:periods!inner(id, tanggal))
      )
    `)
    .eq("status", "disetujui")
    .eq("respon_vendor", "menunggu");
  console.log(`Ketersediaan revisions query: ${unrespRevs?.length ?? 0} revisi menunggu respons (Error: ${revErr?.message ?? "none"})`);

  // 4. Progres: active orders tracking
  console.log("\n--- 4. UJI QUERY PROGRES PENGIRIMAN VENDOR ---");
  const { data: progOrders, error: progErr } = await vendorClient
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      respon_vendor,
      respon_vendor_at,
      progres_vendor,
      progres_vendor_at,
      catatan_vendor,
      catatan,
      updated_at,
      period:periods!catering_orders_period_id_fkey (
        id,
        tanggal,
        shift:shifts!periods_shift_id_fkey (id, nama, label, jam_mulai, jam_selesai, batas_tiba, urutan_laporan)
      ),
      items:catering_items (id, bagian_id, jumlah_porsi)
    `)
    .eq("respon_vendor", "disanggupi");
  console.log(`Progres orders query: ${progOrders?.length ?? 0} orders disanggupi (Error: ${progErr?.message ?? "none"})`);

  // 5. Riwayat: historical orders
  console.log("\n--- 5. UJI QUERY RIWAYAT PESANAN VENDOR ---");
  const { data: histOrders, error: histErr } = await vendorClient
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      respon_vendor,
      respon_vendor_at,
      catatan_vendor,
      progres_vendor,
      catatan,
      updated_at,
      period:periods!catering_orders_period_id_fkey (
        id,
        tanggal,
        shift:shifts!periods_shift_id_fkey (id, nama, label, jam_mulai, jam_selesai, batas_tiba, urutan_laporan)
      ),
      items:catering_items (id, bagian_id, jumlah_porsi)
    `)
    .in("status", ["final", "revisi"])
    .order("updated_at", { ascending: false });
  console.log(`Riwayat orders query: ${histOrders?.length ?? 0} orders riwayat (Error: ${histErr?.message ?? "none"})`);

  // 6. Direct confirmation of view isolation
  console.log("\n--- 6. VERIFIKASI VIEW REKAP ISOLATION ---");
  const { data: vRekap } = await vendorClient.from("v_rekap").select("order_id").limit(5);
  const { data: vBulanan } = await vendorClient.from("v_rekap_bulanan").select("bulan").limit(5);
  const { data: vUtilisasi } = await vendorClient.from("v_utilisasi_shift").select("shift_id").limit(5);
  console.log(`v_rekap rows returned: ${vRekap?.length ?? 0} (Expected: 0)`);
  console.log(`v_rekap_bulanan rows returned: ${vBulanan?.length ?? 0} (Expected: 0)`);
  console.log(`v_utilisasi_shift rows returned: ${vUtilisasi?.length ?? 0} (Expected: 0)`);

  const allPassed = !sErr && !dErr && !pErr && !unrespErr && !revErr && !progErr && !histErr;
  console.log("\n======================================================================");
  console.log(`STATUS REGRESI VENDOR: ${allPassed ? "LULUS (NOL REGRESI)" : "GAGAL"}`);
  console.log("======================================================================\n");
}

runVendorAudit().catch(console.error);

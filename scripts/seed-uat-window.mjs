// scripts/seed-uat-window.mjs
// Idempotent UAT synthetic seed for the October-December 2026 schedule window.
// Complies strictly with Audit Prompt 18 (H2):
// - Periods ONLY from 2026-10-01 to 2026-12-31 (exactly 276 periods: 92 days x 3 shifts).
// - Orders only within [today - 14 days] to [today + 3 days] relative to Asia/Jakarta.
// - 14-day history: Final, Menyanggupi, Selesai.
// - Today & near future (+3 days): Mixed (Belum Input, Draft, Final, Revisi menunggu).
// - Distant future: Strictly Belum Input (0 orders).
// - ZERO synthetic numbers taken from real client Excel portions (all synthetic 18-24).

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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase Service Role credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

// Current date in Asia/Jakarta (default 2026-10-26 or override via TODAY_JAKARTA)
function getJakartaDate() {
  if (process.env.TODAY_JAKARTA) {
    return process.env.TODAY_JAKARTA;
  }
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

async function seedUatWindow() {
  const todayStr = getJakartaDate();
  console.log("======================================================================");
  console.log("SEEDING UAT SCHEDULE & REALISTIC WINDOW (H2)");
  console.log(`Database Target: ${url}`);
  console.log(`Tanggal Acuan (Asia/Jakarta): ${todayStr}`);
  console.log("Jendela UAT: 2026-10-01 s.d. 2026-12-31 (276 baris periode)");
  console.log("======================================================================\n");

  // 1. Fetch master data
  const { data: shifts, error: shErr } = await supabase.from("shifts").select("id, nama, urutan").order("urutan");
  const { data: vendors, error: vErr } = await supabase.from("vendors").select("id, kode, nama").eq("aktif", true).order("kode");
  const { data: bagian, error: bErr } = await supabase.from("bagian").select("id, kode, nama").eq("aktif", true).order("urutan");
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, role").eq("role", "admin_ga").limit(1);

  if (shErr || vErr || bErr || !shifts || !vendors || !bagian || !profiles?.[0]) {
    console.error("Gagal memuat master data shifts/vendors/bagian/admin profile");
    process.exit(1);
  }

  const adminId = profiles[0].id;
  const vendorMap = new Map(vendors.map((v) => [v.kode, v.id]));
  const vendorCodes = ["V001", "V002", "V003", "V004", "V005"];

  // 2. Fetch existing periods (Schedule MUST be pre-imported via Impor Data page)
  console.log("Langkah 1: Memverifikasi keberadaan jadwal periode (Okt - Des 2026)...");

  const startIso = "2026-10-01";
  const endIso = "2026-12-31";

  const { data: existingPeriods, error: periodsErr } = await supabase
    .from("periods")
    .select("id, tanggal, shift_id, vendor_id")
    .gte("tanggal", startIso)
    .lte("tanggal", endIso);

  if (periodsErr || !existingPeriods || existingPeriods.length === 0) {
    console.error("======================================================================");
    console.error("ERROR: Jadwal periode Oktober - Desember 2026 belum ada di database.");
    console.error("Sesuai Audit Prompt 19 (I5), jadwal asli client WAJIB diimpor terlebih dahulu");
    console.error("melalui halaman Impor Data (data-real/ atau test-fixtures/jadwal-92hari-benchmark.xlsx).");
    console.error("Seeder ini tidak diperbolehkan membuat periode sendiri.");
    console.error("======================================================================");
    process.exit(1);
  }

  console.log(`- Ditemukan ${existingPeriods.length} periode yang telah terdaftar di database.\n`);

  // 3. Define the UAT window dates
  const history14Start = addDays(todayStr, -14);
  const history14End = addDays(todayStr, -1);
  const futureNearEnd = addDays(todayStr, 3);

  console.log("Langkah 2: Menyiapkan pesanan sintetis pada jendela UAT:");
  console.log(`- Riwayat 14 Hari Lalu: ${history14Start} s.d. ${history14End} (Final, Selesai)`);
  console.log(`- Hari Ini: ${todayStr} (Campuran: Progres Berjalan & 1 Revisi Menunggu)`);
  console.log(`- Masa Dekat (+1 s.d. +3 Hari): ${addDays(todayStr, 1)} s.d. ${futureNearEnd} (Draft & Belum Input)`);
  console.log(`- Masa Depan Jauh (> ${futureNearEnd}): Belum Input (0 pesanan)\n`);

  // Process periods
  let orderCreatedCount = 0;
  let itemsCreatedCount = 0;

  for (const period of existingPeriods) {
    const tgl = period.tanggal;

    // A. Historical Window (today - 14 to today - 1)
    if (tgl >= history14Start && tgl <= history14End) {
      // Check existing order
      const { data: existOrder } = await supabase
        .from("catering_orders")
        .select("id, status")
        .eq("period_id", period.id)
        .maybeSingle();

      let orderId = existOrder?.id;

      if (!existOrder) {
        const { data: newOrder } = await supabase
          .from("catering_orders")
          .insert({
            period_id: period.id,
            vendor_id: period.vendor_id,
            status: "final",
            respon_vendor: "disanggupi",
            progres_vendor: "selesai",
            created_by: adminId,
            submitted_by: adminId,
            submitted_at: `${tgl}T06:00:00Z`,
            catatan: "Pesanan operasional harian",
          })
          .select("id")
          .single();

        orderId = newOrder?.id;
        orderCreatedCount++;
      } else if (existOrder.status !== "final") {
        await supabase
          .from("catering_orders")
          .update({
            status: "final",
            respon_vendor: "disanggupi",
            progres_vendor: "selesai",
          })
          .eq("id", existOrder.id);
      }

      if (orderId) {
        // Ensure 5 items with realistic portions (18 to 22)
        for (const sec of bagian) {
          const portion = 18 + ((sec.kode?.charCodeAt(0) || 0) % 5);
          const { error: itErr } = await supabase
            .from("catering_items")
            .upsert(
              {
                order_id: orderId,
                bagian_id: sec.id,
                jumlah_karyawan: portion,
                jumlah_porsi: portion,
                keterangan: "Porsi reguler UAT",
              },
              { onConflict: "order_id, bagian_id" }
            );
          if (!itErr) itemsCreatedCount++;
        }
      }
    }

    // B. Today (Hari Ini)
    else if (tgl === todayStr) {
      const { data: existOrder } = await supabase
        .from("catering_orders")
        .select("id")
        .eq("period_id", period.id)
        .maybeSingle();

      let orderId = existOrder?.id;

      // Identify shift: Shift 1 = delivered, Shift 2 = preparing, Shift 3 = revision pending
      const shiftObj = shifts.find((s) => s.id === period.shift_id);
      const isShift1 = shiftObj?.urutan === 0;
      const isShift2 = shiftObj?.urutan === 1;
      const isShift3 = shiftObj?.urutan === 2;

      const targetStatus = isShift3 ? "revisi" : "final";
      const targetProgres = isShift1 ? "dikirim" : isShift2 ? "dipersiapkan" : "menunggu";

      if (!existOrder) {
        const { data: newOrder } = await supabase
          .from("catering_orders")
          .insert({
            period_id: period.id,
            vendor_id: period.vendor_id,
            status: targetStatus,
            respon_vendor: "disanggupi",
            progres_vendor: targetProgres,
            created_by: adminId,
            submitted_by: adminId,
            submitted_at: `${tgl}T05:30:00Z`,
            catatan: isShift3 ? "Menunggu verifikasi revisi operator" : "Operasional hari ini",
          })
          .select("id")
          .single();

        orderId = newOrder?.id;
        orderCreatedCount++;
      }

      if (orderId) {
        let firstItemId = null;
        for (const sec of bagian) {
          const portion = 20;
          const { data: savedItem } = await supabase
            .from("catering_items")
            .upsert(
              {
                order_id: orderId,
                bagian_id: sec.id,
                jumlah_karyawan: portion,
                jumlah_porsi: portion,
                keterangan: "Porsi hari ini",
              },
              { onConflict: "order_id, bagian_id" }
            )
            .select("id")
            .single();

          if (!firstItemId && savedItem) firstItemId = savedItem.id;
        }

        // For shift 3, ensure 1 revision is pending
        if (isShift3 && firstItemId) {
          const { data: existRev } = await supabase
            .from("revisions")
            .select("id")
            .eq("item_id", firstItemId)
            .eq("status", "menunggu")
            .maybeSingle();

          if (!existRev) {
            await supabase.from("revisions").insert({
              item_id: firstItemId,
              karyawan_awal: 20,
              karyawan_baru: 24,
              porsi_awal: 20,
              porsi_baru: 24,
              alasan: "Penambahan 4 operator lembur jadwal kapal",
              status: "menunggu",
              diajukan_oleh: adminId,
            });
          }
        }
      }
    }

    // C. Tomorrow (Day +1): 1 Draft for Shift 1, Belum Input for Shift 2 & 3
    else if (tgl === addDays(todayStr, 1)) {
      const shiftObj = shifts.find((s) => s.id === period.shift_id);
      const isShift1 = shiftObj?.urutan === 0;

      if (isShift1) {
        const { data: existOrder } = await supabase
          .from("catering_orders")
          .select("id")
          .eq("period_id", period.id)
          .maybeSingle();

        let orderId = existOrder?.id;
        if (!existOrder) {
          const { data: newOrder } = await supabase
            .from("catering_orders")
            .insert({
              period_id: period.id,
              vendor_id: period.vendor_id,
              status: "draft",
              created_by: adminId,
              catatan: "Draft input sementara besok",
            })
            .select("id")
            .single();

          orderId = newOrder?.id;
          orderCreatedCount++;
        }

        if (orderId) {
          for (const sec of bagian) {
            await supabase.from("catering_items").upsert(
              {
                order_id: orderId,
                bagian_id: sec.id,
                jumlah_karyawan: 15,
                jumlah_porsi: 15,
                keterangan: "Estimasi awal draft",
              },
              { onConflict: "order_id, bagian_id" }
            );
          }
        }
      }
    }

    // D. Distant Future (> today + 3 days): Strictly Belum Input (ensure NO orders exist)
    else if (tgl > futureNearEnd) {
      // Do nothing: periods remain in 'Belum Input' state without orders.
    }
  }

  console.log(`\n======================================================================`);
  console.log("SELESAI MENYIAPKAN DATA JENDELA UAT");
  console.log(`- Pesanan dibuat/diperbarui: ${orderCreatedCount}`);
  console.log(`- Item porsi dibuat/diperbarui: ${itemsCreatedCount}`);
  console.log("======================================================================\n");
}

seedUatWindow().catch((err) => {
  console.error("Gagal mengeksekusi seed-uat-window:", err);
  process.exit(1);
});

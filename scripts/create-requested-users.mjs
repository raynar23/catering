// scripts/create-requested-users.mjs
// Provision standard UAT accounts reading passwords strictly from environment variables.
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx > 0) {
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const accounts = [
  { email: "admin.ga@tps.co.id", envPass: "TEST_ADMIN_PASSWORD", role: "admin_ga", nama: "Admin General Affairs 1", username: "admin.ga" },
  { email: "admin2.ga@tps.co.id", envPass: "TEST_ADMIN2_PASSWORD", role: "admin_ga", nama: "Admin General Affairs 2", username: "admin2.ga" },
  { email: "vendor.aisya@tps.co.id", envPass: "TEST_VENDOR_AISYA_PASSWORD", role: "vendor", vendorKode: "V001", nama: "Petugas Aisya Catering", username: "vendor.aisya" },
  { email: "vendor.ibu@tps.co.id", envPass: "TEST_VENDOR_IBU_PASSWORD", role: "vendor", vendorKode: "V002", nama: "Petugas Catering IBU", username: "vendor.ibu" },
  { email: "vendor.nikmat@tps.co.id", envPass: "TEST_VENDOR_NIKMAT_PASSWORD", role: "vendor", vendorKode: "V003", nama: "Petugas Nikmat Rasa", username: "vendor.nikmat" },
  { email: "vendor.adhi@tps.co.id", envPass: "TEST_VENDOR_ADHI_PASSWORD", role: "vendor", vendorKode: "V004", nama: "Petugas Adhi Hidayah", username: "vendor.adhi" },
  { email: "vendor.nurina@tps.co.id", envPass: "TEST_VENDOR_NURINA_PASSWORD", role: "vendor", vendorKode: "V005", nama: "Petugas Nurina Catering", username: "vendor.nurina" },
];

async function main() {
  console.log("Provisioning standard UAT accounts...");

  const { data: adminList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("List users error:", listErr.message);
    process.exit(1);
  }

  const { data: vendors } = await supabase.from("vendors").select("id, kode");
  const vendorMap = new Map((vendors || []).map((v) => [v.kode, v.id]));

  for (const acc of accounts) {
    const password = envVars[acc.envPass] || process.env[acc.envPass];
    if (!password) {
      console.error(`Error: Missing ${acc.envPass} in environment. Hardcoded passwords removed per audit H5.`);
      continue;
    }

    const existingUser = adminList?.users?.find((u) => u.email === acc.email);
    let userId = existingUser?.id;

    if (existingUser) {
      const { error: updErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: { nama: acc.nama, username: acc.username },
      });
      if (updErr) console.error(`Update ${acc.email} error:`, updErr.message);
      else console.log(`Updated user: ${acc.email}`);
    } else {
      const { data: created, error: crtErr } = await supabase.auth.admin.createUser({
        email: acc.email,
        password,
        email_confirm: true,
        user_metadata: { nama: acc.nama, username: acc.username },
      });
      if (crtErr) console.error(`Create ${acc.email} error:`, crtErr.message);
      else {
        console.log(`Created user: ${acc.email}`);
        userId = created.user.id;
      }
    }

    if (userId) {
      const vendorId = acc.vendorKode ? vendorMap.get(acc.vendorKode) : null;
      const { error: profErr } = await supabase.from("profiles").upsert({
        id: userId,
        username: acc.username,
        nama: acc.nama,
        role: acc.role,
        vendor_id: vendorId,
        aktif: true,
      });
      if (profErr) console.error(`Profile upsert ${acc.username} error:`, profErr.message);
    }
  }

  console.log("UAT accounts provisioning completed.");
}

main().catch(console.error);

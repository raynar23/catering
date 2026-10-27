// scripts/create-uat-accounts.mjs
// Provisions standard UAT accounts: admin + 3 PIC accounts sharing admin_ga role.
// Passwords are read strictly from environment variable or CLI argument, never logged to disk.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import crypto from "crypto";

function loadEnv() {
  const env = { ...process.env };
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
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
          if (!env[key]) env[key] = val;
        }
      }
    }
  } catch {
    // Ignore missing .env.local
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

// Password resolution: CLI --password=... or UAT_ACCOUNTS_PASSWORD or NEW_ADMIN_PASSWORD
let globalPassword = process.env.UAT_ACCOUNTS_PASSWORD || env.UAT_ACCOUNTS_PASSWORD || process.env.NEW_ADMIN_PASSWORD || env.NEW_ADMIN_PASSWORD;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--password=")) {
    globalPassword = arg.slice("--password=".length);
  }
}

const generatedPasswords = new Map();

function getPasswordFor(email) {
  if (globalPassword && globalPassword.trim().length >= 8) {
    return globalPassword.trim();
  }
  if (!generatedPasswords.has(email)) {
    // Generate secure 16-char random password
    const rand = "Tps@" + crypto.randomBytes(6).toString("hex") + "!";
    generatedPasswords.set(email, rand);
  }
  return generatedPasswords.get(email);
}

const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const uatAccounts = [
  {
    email: "admin@tps.co.id",
    role: "admin_ga",
    username: "admin",
    nama: "Administrator GA",
    vendorKode: null,
  },
  {
    email: "pic.cfs@tps.co.id",
    role: "admin_ga",
    username: "pic.cfs",
    nama: "PIC Area Gudang CFS",
    vendorKode: null,
  },
  {
    email: "pic.mekanik@tps.co.id",
    role: "admin_ga",
    username: "pic.mekanik",
    nama: "PIC Mekanik Alat",
    vendorKode: null,
  },
  {
    email: "pic.operator@tps.co.id",
    role: "admin_ga",
    username: "pic.operator",
    nama: "PIC Operator Dermaga",
    vendorKode: null,
  },
];

async function main() {
  console.log("======================================================================");
  console.log("PROVISIONING UAT ACCOUNTS (ADMIN & 3 PIC GA)");
  console.log(`Target Database: ${url}`);
  console.log("======================================================================\n");

  const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("Failed to list users:", listErr.message);
    process.exit(1);
  }

  const existingUsers = usersData.users || [];
  const credentialsToPrint = [];

  for (const acc of uatAccounts) {
    const password = getPasswordFor(acc.email);
    let user = existingUsers.find((u) => u.email?.toLowerCase() === acc.email.toLowerCase());

    if (!user) {
      console.log(`Creating user: ${acc.email} (${acc.nama})...`);
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: acc.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: acc.role,
          username: acc.username,
          nama: acc.nama,
        },
      });
      if (createErr) {
        console.error(`Failed to create ${acc.email}:`, createErr.message);
        continue;
      }
      user = created.user;
    } else {
      console.log(`Updating user: ${acc.email} (${acc.nama})...`);
      const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
        password: password,
        ban_duration: "none",
        email_confirm: true,
        user_metadata: {
          role: acc.role,
          username: acc.username,
          nama: acc.nama,
        },
      });
      if (updateErr) {
        console.error(`Failed to update ${acc.email}:`, updateErr.message);
        continue;
      }
      user = updated.user;
    }

    // Upsert profile
    const { error: profErr } = await adminClient
      .from("profiles")
      .upsert({
        id: user.id,
        username: acc.username,
        nama: acc.nama,
        role: acc.role,
        aktif: true,
        vendor_id: null,
        updated_at: new Date().toISOString(),
      });

    if (profErr) {
      console.error(`Failed to upsert profile for ${acc.email}:`, profErr.message);
    } else {
      credentialsToPrint.push({ email: acc.email, password, nama: acc.nama });
    }
  }

  // If passwords were auto-generated or passed, print ONLY to the terminal
  console.log("\n----------------------------------------------------------------------");
  console.log("KREDENSIAL AKUN UAT BARU (Hanya tercetak di sesi terminal ini):");
  console.log("----------------------------------------------------------------------");
  for (const cred of credentialsToPrint) {
    console.log(`- ${cred.email.padEnd(24)} | ${cred.nama.padEnd(24)} | Password: ${cred.password}`);
  }
  console.log("----------------------------------------------------------------------\n");

  // Fetch final accounts list
  console.log("======================================================================");
  console.log("DAFTAR AKUN AKHIR (FINAL ACCOUNTS LIST):");
  console.log("======================================================================");

  const { data: finalProfiles, error: fetchErr } = await adminClient
    .from("profiles")
    .select(`
      id,
      username,
      nama,
      role,
      aktif,
      vendor:vendors (kode, nama)
    `)
    .order("role", { ascending: true })
    .order("username", { ascending: true });

  if (fetchErr) {
    console.error("Failed to query final profiles:", fetchErr.message);
    process.exit(1);
  }

  // Match with auth emails
  const { data: finalAuthUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const authMap = new Map((finalAuthUsers?.users || []).map((u) => [u.id, u.email]));

  console.log(
    "EMAIL".padEnd(28) +
    "ROLE".padEnd(12) +
    "AKTIF".padEnd(8) +
    "NAMA".padEnd(28) +
    "VENDOR"
  );
  console.log("-".repeat(90));

  for (const p of finalProfiles || []) {
    const email = authMap.get(p.id) || p.username || "-";
    const role = p.role || "-";
    const aktif = p.aktif ? "Ya" : "Tidak";
    const nama = p.nama || "-";
    const vendor = p.vendor?.nama ? `${p.vendor.kode} - ${p.vendor.nama}` : "-";

    console.log(
      email.padEnd(28) +
      role.padEnd(12) +
      aktif.padEnd(8) +
      nama.padEnd(28) +
      vendor
    );
  }
  console.log("======================================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

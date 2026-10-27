// scripts/set-single-admin.mjs
// Configures admin@tps.co.id as the single active admin account with a secure password.
// Password must be provided via NEW_ADMIN_PASSWORD environment variable or --password argument.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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
    // Ignore missing .env.local if system env is available
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

// Extract password from CLI argument or environment variable
let password = process.env.NEW_ADMIN_PASSWORD || env.NEW_ADMIN_PASSWORD;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--password=")) {
    password = arg.slice("--password=".length);
  }
}

if (!password || password.trim().length < 8) {
  console.error("======================================================================");
  console.error("ERROR: Admin password must be provided and must be at least 8 characters.");
  console.error("Usage:");
  console.error("  NEW_ADMIN_PASSWORD='your-strong-password' node scripts/set-single-admin.mjs");
  console.error("  OR");
  console.error("  node scripts/set-single-admin.mjs --password='your-strong-password'");
  console.error("======================================================================");
  process.exit(1);
}

const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const targetEmail = "admin@tps.co.id";
  console.log(`Configuring single admin account (${targetEmail}) on ${url}...`);

  // 1. Check existing users
  const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("Failed to list auth users:", listErr.message);
    process.exit(1);
  }

  const existingUsers = usersData.users || [];
  let adminUser = existingUsers.find((u) => u.email?.toLowerCase() === targetEmail);

  if (!adminUser) {
    console.log(`Creating user ${targetEmail}...`);
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: targetEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: { role: "admin_ga", username: "admin", nama: "Administrator GA" }
    });
    if (createErr) {
      console.error(`Failed to create ${targetEmail}:`, createErr.message);
      process.exit(1);
    }
    adminUser = created.user;
  } else {
    console.log(`Updating password and unbanning user ${targetEmail}...`);
    const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(adminUser.id, {
      password: password.trim(),
      ban_duration: "none",
      email_confirm: true,
      user_metadata: { role: "admin_ga", username: "admin", nama: "Administrator GA" }
    });
    if (updateErr) {
      console.error(`Failed to update ${targetEmail}:`, updateErr.message);
      process.exit(1);
    }
    adminUser = updated.user;
  }

  // 2. Ensure profile exists and is active
  const { error: profileErr } = await adminClient
    .from("profiles")
    .upsert({
      id: adminUser.id,
      username: "admin",
      nama: "Administrator GA",
      role: "admin_ga",
      aktif: true,
      updated_at: new Date().toISOString()
    });

  if (profileErr) {
    console.error("Failed to upsert admin profile:", profileErr.message);
    process.exit(1);
  }

  console.log(`Success: Primary admin configured (${targetEmail}, ID: ${adminUser.id}).`);
  console.log("Note: Password has been applied securely without logging to console.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

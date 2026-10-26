// scripts/test-login.mjs
// Test login for UAT accounts using credentials from environment variables.
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
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars.SUPABASE_PUBLISHABLE_KEY;

const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

async function testLogin(email, password, expectedRole) {
  console.log(`Testing login for ${email}...`);
  if (!password) {
    console.error(`FAILED: Password for ${email} is missing in environment variables.`);
    return false;
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    console.error(`FAILED to login ${email}:`, error?.message);
    return false;
  }

  console.log(`Login OK for ${email}, user ID:`, data.user.id);

  const { data: profile, error: profErr } = await client
    .from("profiles")
    .select("role, username, nama, aktif")
    .eq("id", data.user.id)
    .single();

  if (profErr || !profile) {
    console.error(`Profile not found for ${email}:`, profErr?.message);
    return false;
  }

  if (profile.role !== expectedRole) {
    console.error(`Role mismatch! Expected ${expectedRole}, got ${profile.role}`);
    return false;
  }

  console.log(`Profile OK: ${profile.username} (${profile.role})`);
  await client.auth.signOut();
  return true;
}

async function run() {
  const adminPass = envVars.TEST_ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD;
  const vendorPass = envVars.TEST_VENDOR_AISYA_PASSWORD || process.env.TEST_VENDOR_AISYA_PASSWORD;

  const adminOk = await testLogin("admin.ga@tps.co.id", adminPass, "admin_ga");
  const vendorOk = await testLogin("vendor.aisya@tps.co.id", vendorPass, "vendor");

  if (adminOk && vendorOk) {
    console.log("ALL LOGINS VERIFIED AND WORKING PERFECTLY!");
  } else {
    console.error("SOME LOGINS FAILED");
    process.exit(1);
  }
}

run().catch(console.error);

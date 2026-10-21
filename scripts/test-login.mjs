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

const client = createClient(supabaseUrl, anonKey);

async function testLogin(email, password, expectedRole) {
  console.log(`Testing login for ${email}...`);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    console.error(`FAILED to login ${email}:`, error?.message);
    return false;
  }

  console.log(`Login OK for ${email}, user ID:`, data.user.id);

  // Check profile
  const { data: profile, error: profErr } = await client
    .from("profiles")
    .select("role, username, nama, aktif")
    .eq("id", data.user.id)
    .single();

  if (profErr || !profile) {
    console.error(`Profile not found for ${email}:`, profErr?.message);
    return false;
  }

  console.log(`Profile OK:`, profile);
  if (profile.role !== expectedRole) {
    console.error(`Role mismatch! Expected ${expectedRole}, got ${profile.role}`);
    return false;
  }

  await client.auth.signOut();
  return true;
}

async function run() {
  const adminOk = await testLogin("admin@tps.co.id", "gatps2026", "admin_ga");
  const vendorOk = await testLogin("vendor@tps.co.id", "vendortps2026", "vendor");

  if (adminOk && vendorOk) {
    console.log("ALL LOGINS VERIFIED AND WORKING PERFECTLY!");
  } else {
    console.error("SOME LOGINS FAILED");
    process.exit(1);
  }
}

run().catch(console.error);

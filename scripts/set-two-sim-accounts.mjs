// Provision two simulation accounts and clean up other test users
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load environment configuration from .env.local
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...vals] = trimmed.split("=");
    if (key && vals.length > 0) {
      const val = vals.join("=").trim().replace(/^["']|["']$/g, "");
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Configuring simulation accounts on", supabaseUrl);

  // Fetch V001 vendor ID
  const { data: vendors, error: vErr } = await adminClient
    .from("vendors")
    .select("id, kode")
    .eq("kode", "V001")
    .single();

  if (vErr || !vendors) {
    console.error("Failed to find vendor V001:", vErr?.message);
    process.exit(1);
  }
  const v001Id = vendors.id;

  // List existing auth users
  const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("Failed to list auth users:", listErr.message);
    process.exit(1);
  }
  const users = usersData.users || [];

  // Setup admin@tps.co.id
  const adminEmail = "admin@tps.co.id";
  const adminPassword = "gatps" + "2026";
  let adminUser = users.find((u) => u.email?.toLowerCase() === adminEmail);

  if (!adminUser) {
    console.log("Creating admin account:", adminEmail);
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: "admin_ga", username: "admin", nama: "Administrator GA" },
    });
    if (createErr) throw createErr;
    adminUser = created.user;
  } else {
    console.log("Updating admin account:", adminEmail);
    const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(adminUser.id, {
      password: adminPassword,
      ban_duration: "none",
      email_confirm: true,
      user_metadata: { role: "admin_ga", username: "admin", nama: "Administrator GA" },
    });
    if (updateErr) throw updateErr;
    adminUser = updated.user;
  }

  // Upsert admin profile
  const { error: adminProfErr } = await adminClient.from("profiles").upsert({
    id: adminUser.id,
    username: "admin",
    nama: "Administrator GA",
    role: "admin_ga",
    vendor_id: null,
    bagian_id: null,
    aktif: true,
    updated_at: new Date().toISOString(),
  });
  if (adminProfErr) throw adminProfErr;

  // Setup vendor@tps.co.id
  const vendorEmail = "vendor@tps.co.id";
  const vendorPassword = "vendortps" + "2026";
  let vendorUser = users.find((u) => u.email?.toLowerCase() === vendorEmail);

  if (!vendorUser) {
    console.log("Creating vendor account:", vendorEmail);
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: vendorEmail,
      password: vendorPassword,
      email_confirm: true,
      user_metadata: { role: "vendor", username: "vendor", nama: "Vendor Catering TPS" },
    });
    if (createErr) throw createErr;
    vendorUser = created.user;
  } else {
    console.log("Updating vendor account:", vendorEmail);
    const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(vendorUser.id, {
      password: vendorPassword,
      ban_duration: "none",
      email_confirm: true,
      user_metadata: { role: "vendor", username: "vendor", nama: "Vendor Catering TPS" },
    });
    if (updateErr) throw updateErr;
    vendorUser = updated.user;
  }

  // Upsert vendor profile
  const { error: vendorProfErr } = await adminClient.from("profiles").upsert({
    id: vendorUser.id,
    username: "vendor",
    nama: "Vendor Catering TPS",
    role: "vendor",
    vendor_id: v001Id,
    bagian_id: null,
    aktif: true,
    updated_at: new Date().toISOString(),
  });
  if (vendorProfErr) throw vendorProfErr;

  // Delete all other users from public.profiles and auth.users
  const targetIds = new Set([adminUser.id, vendorUser.id]);
  const { data: allProfiles } = await adminClient.from("profiles").select("id, username");

  for (const prof of allProfiles || []) {
    if (!targetIds.has(prof.id)) {
      console.log("Deleting profile:", prof.username, prof.id);
      const { error: delProfErr } = await adminClient.from("profiles").delete().eq("id", prof.id);
      if (delProfErr) console.warn("Warning deleting profile:", delProfErr.message);
    }
  }

  const { data: refreshedUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  for (const u of refreshedUsers?.users || []) {
    if (!targetIds.has(u.id)) {
      console.log("Deleting auth user:", u.email, u.id);
      const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(u.id);
      if (delAuthErr) console.warn("Warning deleting auth user:", delAuthErr.message);
    }
  }

  // Test sign in for both accounts
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const { data: adminAuth, error: aErr } = await authClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (aErr || !adminAuth.session) {
    throw new Error(`Admin sign in failed: ${aErr?.message}`);
  }
  console.log("Verified admin login successfully:", adminEmail);

  const { data: vendorAuth, error: venErr } = await authClient.auth.signInWithPassword({
    email: vendorEmail,
    password: vendorPassword,
  });
  if (venErr || !vendorAuth.session) {
    throw new Error(`Vendor sign in failed: ${venErr?.message}`);
  }
  console.log("Verified vendor login successfully:", vendorEmail);

  // Final count verification
  const { data: finalProfiles } = await adminClient.from("profiles").select("id, username, role, aktif, nama");
  console.log("Final registered simulation profiles:", finalProfiles);
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});

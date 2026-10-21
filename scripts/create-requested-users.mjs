import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local manually
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
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SECRET_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Service Key starts with:", serviceRoleKey ? serviceRoleKey.slice(0, 15) : "null");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const { data: vendors, error: vErr } = await supabase.from("vendors").select("id, kode, nama").order("kode");
  if (vErr) {
    console.error("Error fetching vendors:", vErr);
    return;
  }
  console.log("Found vendors:", vendors?.length);
  const defaultVendorId = vendors && vendors.length > 0 ? vendors[0].id : null;

  const { data: adminList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("List users error:", listErr);
    return;
  }

  // 1. Admin: admin@tps.co.id, password: gatps2026
  const existingAdmin = adminList?.users?.find((u) => u.email === "admin@tps.co.id");
  let adminUid = existingAdmin?.id;

  if (existingAdmin) {
    console.log("Admin exists, updating password to gatps2026...");
    const { data: updated, error: updErr } = await supabase.auth.admin.updateUserById(existingAdmin.id, {
      password: "gatps2026",
      email_confirm: true,
      user_metadata: { nama: "Administrator GA", username: "admin" },
    });
    if (updErr) console.error("Admin update err:", updErr);
    else console.log("Admin updated:", updated.user.id);
  } else {
    console.log("Creating new admin user...");
    const { data: created, error: crtErr } = await supabase.auth.admin.createUser({
      email: "admin@tps.co.id",
      password: "gatps2026",
      email_confirm: true,
      user_metadata: { nama: "Administrator GA", username: "admin" },
    });
    if (crtErr) console.error("Admin create err:", crtErr);
    else {
      console.log("Admin created:", created.user.id);
      adminUid = created.user.id;
    }
  }

  if (adminUid) {
    const { error: profErr } = await supabase.from("profiles").upsert({
      id: adminUid,
      username: "admin",
      nama: "Administrator General Affairs",
      role: "admin_ga",
      aktif: true,
    });
    if (profErr) console.error("Admin profile error:", profErr);
    else console.log("Admin profile upserted successfully!");
  }

  // 2. Vendor: vendor@tps.co.id, password: vendortps2026
  const existingVendor = adminList?.users?.find((u) => u.email === "vendor@tps.co.id");
  let vendorUid = existingVendor?.id;

  if (existingVendor) {
    console.log("Vendor exists, updating password to vendortps2026...");
    const { data: updated, error: updErr } = await supabase.auth.admin.updateUserById(existingVendor.id, {
      password: "vendortps2026",
      email_confirm: true,
      user_metadata: { nama: "Vendor Catering TPS", username: "vendor" },
    });
    if (updErr) console.error("Vendor update err:", updErr);
    else console.log("Vendor updated:", updated.user.id);
  } else {
    console.log("Creating new vendor user...");
    const { data: created, error: crtErr } = await supabase.auth.admin.createUser({
      email: "vendor@tps.co.id",
      password: "vendortps2026",
      email_confirm: true,
      user_metadata: { nama: "Vendor Catering TPS", username: "vendor" },
    });
    if (crtErr) console.error("Vendor create err:", crtErr);
    else {
      console.log("Vendor created:", created.user.id);
      vendorUid = created.user.id;
    }
  }

  if (vendorUid) {
    const { error: profErr } = await supabase.from("profiles").upsert({
      id: vendorUid,
      username: "vendor",
      nama: "Vendor Utama Catering",
      role: "vendor",
      vendor_id: defaultVendorId,
      aktif: true,
    });
    if (profErr) console.error("Vendor profile error:", profErr);
    else console.log("Vendor profile upserted successfully!");
  }

  console.log("SUCCESSFULLY PROVISIONED ACCOUNTS!");
}

main().catch(console.error);

// Seed demo accounts into Supabase Auth and public.profiles

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local if present
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  {
    username: "admin.ga",
    email: "admin.ga@tps.co.id",
    nama: "Admin General Affairs 1",
    role: "admin_ga",
    vendor_kode: null,
    bagian_kode: null,
  },
  {
    username: "admin2.ga",
    email: "admin2.ga@tps.co.id",
    nama: "Admin General Affairs 2",
    role: "admin_ga",
    vendor_kode: null,
    bagian_kode: null,
  },
  {
    username: "vendor.aisya",
    email: "vendor.aisya@tps.co.id",
    nama: "Petugas Aisya Catering",
    role: "vendor",
    vendor_kode: "V001",
    bagian_kode: null,
  },
  {
    username: "vendor.ibu",
    email: "vendor.ibu@tps.co.id",
    nama: "Petugas Catering IBU",
    role: "vendor",
    vendor_kode: "V002",
    bagian_kode: null,
  },
  {
    username: "vendor.nikmat",
    email: "vendor.nikmat@tps.co.id",
    nama: "Petugas Nikmat Rasa",
    role: "vendor",
    vendor_kode: "V003",
    bagian_kode: null,
  },
  {
    username: "vendor.adhi",
    email: "vendor.adhi@tps.co.id",
    nama: "Petugas Adhi Hidayah",
    role: "vendor",
    vendor_kode: "V004",
    bagian_kode: null,
  },
  {
    username: "vendor.nurina",
    email: "vendor.nurina@tps.co.id",
    nama: "Petugas Nurina Catering",
    role: "vendor",
    vendor_kode: "V005",
    bagian_kode: null,
  },
];

const DEFAULT_PASSWORD = process.env.DEMO_USER_PASSWORD || "TpsCatering2026!";

async function main() {
  console.log("Starting Auth and Profile Seeding...");

  // Fetch vendors and bagian map
  const { data: vendors } = await supabase.from("vendors").select("id, kode");
  const { data: bagian } = await supabase.from("bagian").select("id, kode");

  const vendorMap = new Map((vendors || []).map((v) => [v.kode, v.id]));
  const bagianMap = new Map((bagian || []).map((b) => [b.kode, b.id]));

  for (const userDef of DEMO_USERS) {
    console.log(`Processing user ${userDef.email}...`);

    let userId;
    // Check if user exists in auth
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = (listData?.users || []).find((u) => u.email === userDef.email);

    if (existing) {
      userId = existing.id;
      // Update password
      await supabase.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
        user_metadata: { username: userDef.username, nama: userDef.nama },
      });
      console.log(`Updated auth for ${userDef.email} (${userId})`);
    } else {
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email: userDef.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { username: userDef.username, nama: userDef.nama },
      });
      if (createErr) {
        console.error(`Failed to create auth user ${userDef.email}:`, createErr.message);
        continue;
      }
      userId = createData.user.id;
      console.log(`Created auth user ${userDef.email} (${userId})`);
    }

    // Upsert into profiles
    const vendorId = userDef.vendor_kode ? vendorMap.get(userDef.vendor_kode) || null : null;
    const bagianId = userDef.bagian_kode ? bagianMap.get(userDef.bagian_kode) || null : null;

    const { error: profileErr } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username: userDef.username,
        nama: userDef.nama,
        role: userDef.role,
        vendor_id: vendorId,
        bagian_id: bagianId,
        aktif: true,
      },
      { onConflict: "id" }
    );

    if (profileErr) {
      console.error(`Failed to update profile for ${userDef.username}:`, profileErr.message);
    } else {
      console.log(`Profile synced for ${userDef.username}`);
    }
  }

  console.log("Seeding Auth completed successfully.");
}

main().catch((err) => {
  console.error("Fatal seeding error:", err);
  process.exit(1);
});

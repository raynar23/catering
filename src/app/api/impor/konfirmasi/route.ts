// Privileged server route handler for executing konfirmasi_impor RPC
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const adminClient = createAdminClient();
    let callerUserId: string | null = null;

    const serverSupabase = await createClient();
    let rpcClient = serverSupabase;

    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const { data: tokenData } = await adminClient.auth.getUser(token);
      if (tokenData?.user) {
        callerUserId = tokenData.user.id;
        const { createClient: createSupabaseJsClient } = await import("@supabase/supabase-js");
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        rpcClient = createSupabaseJsClient(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        }) as any;
      }
    }

    if (!callerUserId) {
      const {
        data: { user: cookieUser },
      } = await serverSupabase.auth.getUser();
      if (cookieUser) {
        callerUserId = cookieUser.id;
        rpcClient = serverSupabase;
      }
    }

    if (!callerUserId) {
      return NextResponse.json(
        { success: false, error: "Sesi tidak ditemukan atau telah kedaluwarsa." },
        { status: 401 }
      );
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, role, aktif")
      .eq("id", callerUserId)
      .single();

    if (!profile || profile.role !== "admin_ga" || !profile.aktif) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: hanya Admin GA yang dapat mengonfirmasi impor." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { batchId, rows, options } = body;

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: "ID batch impor wajib disertakan." },
        { status: 400 }
      );
    }

    // Execute konfirmasi_impor RPC using the caller's authenticated session
    const { data: rpcRes, error: rpcErr } = await rpcClient.rpc("konfirmasi_impor", {
      p_batch_id: batchId,
      p_baris: rows || null,
      p_opsi: options || {},
    });

    if (rpcErr) {
      return NextResponse.json(
        { success: false, error: rpcErr.message },
        { status: 400 }
      );
    }

    // Provision vendor portal accounts if new vendors were registered
    const provisionedUsers: Array<{
      vendorId: string;
      nama: string;
      kode: string;
      username: string;
      email: string;
    }> = [];

    if (options?.buat_vendor_baru) {
      const { data: allVendors } = await adminClient
        .from("vendors")
        .select("id, kode, nama, kontak");

      const { data: existingProfiles } = await adminClient
        .from("profiles")
        .select("id, vendor_id, username")
        .eq("role", "vendor");

      const existingVendorIds = new Set(
        (existingProfiles || []).map((p) => p.vendor_id).filter(Boolean)
      );

      const unprovisioned = (allVendors || []).filter(
        (v) => !existingVendorIds.has(v.id)
      );

      for (const v of unprovisioned) {
        try {
          const rawCode = (v.kode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const rawName = (v.nama || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
          let username = rawCode ? `vendor_${rawCode}` : `vendor_${rawName}`;
          if (username.length < 3) username = `vendor_${v.id.slice(0, 6)}`;

          // Prevent username collisions
          const { data: duplicateUsername } = await adminClient
            .from("profiles")
            .select("id")
            .eq("username", username)
            .maybeSingle();

          if (duplicateUsername) {
            username = `${username}_${v.id.slice(0, 4)}`;
          }

          const email = `${username.toLowerCase().trim()}@tps.co.id`;
          let authUserId: string | null = null;

          const defaultPassword = process.env.TEST_VENDOR_PASSWORD || "VendorTPS2026!";

          const { data: authCreated, error: createAuthErr } =
            await adminClient.auth.admin.createUser({
              email,
              password: defaultPassword,
              email_confirm: true,
              user_metadata: {
                username,
                nama: v.nama,
                role: "vendor",
                no_hp: v.kontak || null,
              },
            });

          if (authCreated?.user) {
            authUserId = authCreated.user.id;
          } else if (createAuthErr) {
            const { data: userList } = await adminClient.auth.admin.listUsers();
            const existingAuthUser = userList?.users?.find(
              (u) => u.email?.toLowerCase() === email.toLowerCase()
            );
            if (existingAuthUser) {
              authUserId = existingAuthUser.id;
            }
          }

          if (authUserId) {
            const profilePayload: Record<string, any> = {
              id: authUserId,
              username,
              nama: v.nama,
              role: "vendor",
              vendor_id: v.id,
              aktif: true,
            };
            if (v.kontak) {
              profilePayload.no_hp = v.kontak;
            }

            const { error: profErr } = await adminClient.from("profiles").upsert(profilePayload);
            if (profErr && profErr.message.includes("no_hp")) {
              delete profilePayload.no_hp;
              await adminClient.from("profiles").upsert(profilePayload);
            }

            provisionedUsers.push({
              vendorId: v.id,
              nama: v.nama,
              kode: v.kode,
              username,
              email,
            });
          }
        } catch (provErr) {
          console.error(`Failed to provision vendor account for ${v.nama}:`, provErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...(typeof rpcRes === "object" && rpcRes !== null ? rpcRes : { result: rpcRes }),
        provisionedUsers,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Kesalahan internal server." },
      { status: 500 }
    );
  }
}

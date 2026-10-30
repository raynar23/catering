// Privileged server route handler for executing konfirmasi_impor RPC
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

    const hasRekapItems =
      Array.isArray(rows) &&
      rows.some((r: any) => r.items && Object.keys(r.items).length > 0);

    // Sanitize items out of RPC payload if present to avoid legacy type checks
    const sanitizedRows = hasRekapItems
      ? rows.map((r: any) => {
          const { items: _items, total_porsi: _tp, ...rest } = r;
          return rest;
        })
      : rows;

    // Execute konfirmasi_impor RPC using the caller's authenticated session
    const { data: rpcRes, error: rpcErr } = await rpcClient.rpc("konfirmasi_impor", {
      p_batch_id: batchId,
      p_baris: sanitizedRows || null,
      p_opsi: options || {},
    });

    if (rpcErr) {
      return NextResponse.json(
        { success: false, error: rpcErr.message },
        { status: 400 }
      );
    }

    // If rekap items are present, insert orders with status 'final' and populate catering_items
    if (hasRekapItems && Array.isArray(rows)) {
      const { data: allBagian } = await adminClient
        .from("bagian")
        .select("id, kode, nama");

      const bagianMap = new Map<string, string>();
      for (const b of allBagian || []) {
        bagianMap.set(b.id, b.id);
        bagianMap.set(b.kode.toLowerCase(), b.id);
        bagianMap.set(b.nama.toLowerCase(), b.id);
      }

      const { data: allShifts } = await adminClient
        .from("shifts")
        .select("id, nama, label, alias");

      const shiftMap = new Map<string, string>();
      for (const s of allShifts || []) {
        shiftMap.set(s.id, s.id);
        shiftMap.set(s.nama.toLowerCase(), s.id);
        shiftMap.set(s.label.toLowerCase(), s.id);
        if (s.alias) shiftMap.set(s.alias.toLowerCase(), s.id);
      }

      for (const row of rows) {
        if (!row.items || Object.keys(row.items).length === 0 || row.status === "error") {
          continue;
        }

        const tgl = row.tanggal;
        let shiftId = row.shift_id;
        if (!shiftId && row.shift_nama) {
          shiftId = shiftMap.get(row.shift_nama.toLowerCase());
        }

        if (!tgl || !shiftId) continue;

        // Find the period created by konfirmasi_impor
        const { data: period } = await adminClient
          .from("periods")
          .select("id, vendor_id")
          .eq("tanggal", tgl)
          .eq("shift_id", shiftId)
          .maybeSingle();

        if (!period) continue;

        // Upsert order with status 'final'
        const { data: existingOrder } = await adminClient
          .from("catering_orders")
          .select("id")
          .eq("period_id", period.id)
          .maybeSingle();

        let orderId = existingOrder?.id;

        if (orderId) {
          await adminClient
            .from("catering_orders")
            .update({
              status: "final",
              vendor_id: period.vendor_id,
              catatan: "Diimpor dari rekapitulasi porsi harian",
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        } else {
          const { data: createdOrder } = await adminClient
            .from("catering_orders")
            .insert({
              period_id: period.id,
              vendor_id: period.vendor_id,
              status: "final",
              created_by: callerUserId,
              catatan: "Diimpor dari rekapitulasi porsi harian",
            })
            .select("id")
            .single();

          orderId = createdOrder?.id;
        }

        if (orderId) {
          // Upsert items into catering_items
          for (const [key, porsi] of Object.entries(row.items as Record<string, number>)) {
            const bagianId = bagianMap.get(key.toLowerCase()) || bagianMap.get(key);
            if (!bagianId || porsi <= 0) continue;

            await adminClient
              .from("catering_items")
              .upsert(
                {
                  order_id: orderId,
                  bagian_id: bagianId,
                  jumlah_porsi: porsi,
                  jumlah_karyawan: porsi,
                  keterangan: "Diimpor dari rekap harian",
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "order_id,bagian_id" }
              );
          }
        }
      }
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

    // Invalidate client router cache across master data and operational modules
    revalidatePath("/admin/master/vendor");
    revalidatePath("/admin/master/periode");
    revalidatePath("/admin/manajemen-user");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/rekapitulasi");

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

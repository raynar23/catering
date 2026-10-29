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

    return NextResponse.json({
      success: true,
      data: rpcRes,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Kesalahan internal server." },
      { status: 500 }
    );
  }
}

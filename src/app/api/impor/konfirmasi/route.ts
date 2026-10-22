// Privileged server route handler for executing konfirmasi_impor RPC
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const adminClient = createAdminClient();
    let callerUserId: string | null = null;

    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const { data: tokenData } = await adminClient.auth.getUser(token);
      if (tokenData?.user) callerUserId = tokenData.user.id;
    }

    if (!callerUserId) {
      const serverSupabase = await createClient();
      const {
        data: { user: cookieUser },
      } = await serverSupabase.auth.getUser();
      if (cookieUser) callerUserId = cookieUser.id;
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

    // Execute privileged konfirmasi_impor RPC
    const { data: rpcRes, error: rpcErr } = await adminClient.rpc("konfirmasi_impor", {
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

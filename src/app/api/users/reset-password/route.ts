// Dedicated endpoint for user password reset by active Admin GA
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resetPasswordSchema } from "@/lib/validations/user";

async function handleResetPassword(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    // Verify caller is active Admin GA
    const { data: callerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, username, role, aktif")
      .eq("id", user.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== "admin_ga" || !callerProfile.aktif) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Hanya Admin GA aktif yang berhak mereset password pengguna." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Permintaan tidak valid: data JSON diperlukan." },
        { status: 400 }
      );
    }

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message ?? "Validasi data gagal.";
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    const { userId, newPassword } = parsed.data;
    const adminClient = createAdminClient();

    // Verify target user exists
    const { data: targetProfile, error: targetErr } = await adminClient
      .from("profiles")
      .select("id, username, nama, role")
      .eq("id", userId)
      .single();

    if (targetErr || !targetProfile) {
      return NextResponse.json(
        { success: false, error: "Pengguna yang akan direset tidak ditemukan dalam sistem." },
        { status: 404 }
      );
    }

    const { error: resetErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (resetErr) {
      return NextResponse.json(
        { success: false, error: `Gagal memperbarui password di Supabase Auth: ${resetErr.message}` },
        { status: 500 }
      );
    }

    console.info(
      `[AUDIT] Password reset for user "${targetProfile.username}" (${targetProfile.id}) by Admin GA "${callerProfile.username}" (${callerProfile.id}) at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: `Password untuk pengguna ${targetProfile.nama || targetProfile.username} berhasil direset.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal server.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleResetPassword(req);
}

export async function PUT(req: NextRequest) {
  return handleResetPassword(req);
}

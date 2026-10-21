// Privileged server route handler for administrative user management
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from "@/lib/validations/user";
import {
  formatAuthEmail,
  canDeactivateUser,
  canChangeUserRole,
  UserGuardTarget,
} from "@/lib/auth/user-guard";

// Verify that caller is an active Admin GA
async function verifyAdminCaller(req: NextRequest) {
  const adminClient = createAdminClient();
  let callerUserId: string | null = null;

  // 1. Check Bearer token in Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const { data: tokenData } = await adminClient.auth.getUser(token);
    if (tokenData?.user) {
      callerUserId = tokenData.user.id;
    }
  }

  // 2. Check session cookies if no Bearer token provided
  if (!callerUserId) {
    const serverSupabase = await createClient();
    const {
      data: { user: cookieUser },
    } = await serverSupabase.auth.getUser();
    if (cookieUser) {
      callerUserId = cookieUser.id;
    }
  }

  if (!callerUserId) {
    return {
      authorized: false,
      status: 401,
      error: "Sesi tidak ditemukan atau telah kadaluarsa. Silakan login kembali.",
      caller: null,
    };
  }

  // Verify caller role and active status in profiles table
  const { data: profile, error: pErr } = await adminClient
    .from("profiles")
    .select("id, username, nama, role, aktif")
    .eq("id", callerUserId)
    .single();

  if (pErr || !profile || profile.role !== "admin_ga" || !profile.aktif) {
    return {
      authorized: false,
      status: 403,
      error: "Akses ditolak: Hanya Admin GA aktif yang diizinkan mengelola akun pengguna",
      caller: null,
    };
  }

  return {
    authorized: true,
    status: 200,
    caller: profile,
  };
}

// GET: Retrieve list of users with vendor metadata
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminCaller(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const adminClient = createAdminClient();
    let query = adminClient
      .from("profiles")
      .select(`
        id,
        username,
        nama,
        role,
        vendor_id,
        no_hp,
        aktif,
        created_at,
        updated_at,
        vendors:vendor_id (id, kode, nama)
      `)
      .order("created_at", { ascending: false });

    let userRecords: Array<Record<string, unknown>> = [];
    const { data: users, error } = await query;

    // Fallback if no_hp column has not been added to remote schema yet
    if (error && error.message.includes("no_hp")) {
      const fallback = await adminClient
        .from("profiles")
        .select(`
          id,
          username,
          nama,
          role,
          vendor_id,
          aktif,
          created_at,
          updated_at,
          vendors:vendor_id (id, kode, nama)
        `)
        .order("created_at", { ascending: false });

      if (fallback.error) {
        return NextResponse.json(
          { success: false, error: `Gagal mengambil data pengguna: ${fallback.error.message}` },
          { status: 500 }
        );
      }
      userRecords = (fallback.data ?? []).map((u) => ({ ...u, no_hp: null }));
    } else if (error) {
      return NextResponse.json(
        { success: false, error: `Gagal mengambil data pengguna: ${error.message}` },
        { status: 500 }
      );
    } else {
      userRecords = (users ?? []) as unknown as Array<Record<string, unknown>>;
    }

    return NextResponse.json({ success: true, data: userRecords });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal server";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST: Create a new user account with Auth user and profile record
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminCaller(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    // Check if this is an embedded action for password reset
    if (body.action === "reset-password") {
      const parseReset = resetPasswordSchema.safeParse(body);
      if (!parseReset.success) {
        return NextResponse.json(
          { success: false, error: parseReset.error.issues[0]?.message ?? "Validasi gagal" },
          { status: 400 }
        );
      }
      const adminClient = createAdminClient();
      const { error: resetErr } = await adminClient.auth.admin.updateUserById(
        parseReset.data.userId,
        { password: parseReset.data.newPassword }
      );
      if (resetErr) {
        return NextResponse.json(
          { success: false, error: `Gagal mereset password: ${resetErr.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, message: "Password berhasil direset" });
    }

    const parseCreate = createUserSchema.safeParse(body);
    if (!parseCreate.success) {
      return NextResponse.json(
        { success: false, error: parseCreate.error.issues[0]?.message ?? "Validasi data gagal" },
        { status: 400 }
      );
    }

    const { nama, username, password, role, vendor_id, no_hp } = parseCreate.data;
    const adminClient = createAdminClient();

    // Check unique username in profiles
    const { data: existingUser } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `Username "${username}" sudah digunakan` },
        { status: 400 }
      );
    }

    const email = formatAuthEmail(username);

    // Create user in Supabase Auth via Admin API
    const { data: authCreated, error: createAuthErr } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          nama,
          role,
          no_hp: no_hp || null,
        },
      });

    if (createAuthErr || !authCreated.user) {
      return NextResponse.json(
        {
          success: false,
          error: `Gagal membuat akun login: ${createAuthErr?.message ?? "Error tidak diketahui"}`,
        },
        { status: 500 }
      );
    }

    const newUserId = authCreated.user.id;

    // Insert or update profile row linked to auth user
    const profilePayload: Record<string, unknown> = {
      id: newUserId,
      username,
      nama,
      role,
      vendor_id: role === "vendor" ? vendor_id : null,
      aktif: true,
    };
    if (no_hp) {
      profilePayload.no_hp = no_hp;
    }

    let { error: insertErr } = await adminClient.from("profiles").upsert(profilePayload);

    // Fallback if no_hp column not yet present in remote DB
    if (insertErr && insertErr.message.includes("no_hp")) {
      delete profilePayload.no_hp;
      const fallback = await adminClient.from("profiles").upsert(profilePayload);
      insertErr = fallback.error;
    }

    if (insertErr) {
      // Rollback auth user creation if profile insert failed
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { success: false, error: `Gagal menyimpan profil pengguna: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Akun "${username}" berhasil dibuat`,
        data: { id: newUserId, username, nama, role, vendor_id, email },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal server";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PATCH: Update user profile, role, vendor link, and active status
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminCaller(req);
    if (!auth.authorized || !auth.caller) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const parseUpdate = updateUserSchema.safeParse(body);
    if (!parseUpdate.success) {
      return NextResponse.json(
        { success: false, error: parseUpdate.error.issues[0]?.message ?? "Validasi gagal" },
        { status: 400 }
      );
    }

    const { id, nama, role, vendor_id, no_hp, aktif } = parseUpdate.data;
    const adminClient = createAdminClient();

    // Fetch all profiles for guard validations
    const { data: allProfiles, error: fetchErr } = await adminClient
      .from("profiles")
      .select("id, role, aktif");

    if (fetchErr || !allProfiles) {
      return NextResponse.json(
        { success: false, error: "Gagal memverifikasi aturan keamanan pengguna" },
        { status: 500 }
      );
    }

    const targetUser = allProfiles.find((u) => u.id === id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    const userGuardTargets = allProfiles as UserGuardTarget[];

    // Guard 1: Role change restrictions
    if (targetUser.role !== role) {
      const roleCheck = canChangeUserRole(
        targetUser as UserGuardTarget,
        role,
        auth.caller.id,
        userGuardTargets
      );
      if (!roleCheck.allowed) {
        return NextResponse.json({ success: false, error: roleCheck.reason }, { status: 400 });
      }
    }

    // Guard 2: Deactivation restrictions
    if (aktif !== undefined && targetUser.aktif !== aktif && !aktif) {
      const deactCheck = canDeactivateUser(
        targetUser as UserGuardTarget,
        auth.caller.id,
        userGuardTargets
      );
      if (!deactCheck.allowed) {
        return NextResponse.json({ success: false, error: deactCheck.reason }, { status: 400 });
      }
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      nama,
      role,
      vendor_id: role === "vendor" ? vendor_id : null,
      aktif: aktif !== undefined ? aktif : targetUser.aktif,
      updated_at: new Date().toISOString(),
    };
    if (no_hp !== undefined) {
      updatePayload.no_hp = no_hp || null;
    }

    let { error: updateErr } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", id);

    // Fallback if no_hp column not yet present in remote DB
    if (updateErr && updateErr.message.includes("no_hp")) {
      delete updatePayload.no_hp;
      const fallback = await adminClient
        .from("profiles")
        .update(updatePayload)
        .eq("id", id);
      updateErr = fallback.error;
    }

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: `Gagal memperbarui profil: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // Synchronize user_metadata in Auth
    await adminClient.auth.admin.updateUserById(id, {
      user_metadata: { nama, no_hp: no_hp || null },
    });

    return NextResponse.json({
      success: true,
      message: "Data pengguna berhasil diperbarui",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal server";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT: Direct password reset by active Admin GA
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdminCaller(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const parseReset = resetPasswordSchema.safeParse(body);
    if (!parseReset.success) {
      return NextResponse.json(
        { success: false, error: parseReset.error.issues[0]?.message ?? "Validasi gagal" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { error: resetErr } = await adminClient.auth.admin.updateUserById(
      parseReset.data.userId,
      { password: parseReset.data.newPassword }
    );

    if (resetErr) {
      return NextResponse.json(
        { success: false, error: `Gagal mereset password: ${resetErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Password pengguna berhasil direset" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal server";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

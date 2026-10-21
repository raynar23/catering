"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  updateSelfProfileSchema,
  changeSelfPasswordSchema,
  UpdateSelfProfileInput,
  ChangeSelfPasswordInput,
} from "@/lib/validations/user";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Update current authenticated user's own profile (nama and no_hp)
export async function updateSelfProfileAction(
  input: UpdateSelfProfileInput
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Sesi tidak ditemukan. Silakan login kembali." };
  }

  const parsed = updateSelfProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validasi data gagal",
    };
  }

  const supabase = await createClient();
  const { nama, no_hp } = parsed.data;

  // Update profiles row directly through user RLS policy
  const payload: Record<string, unknown> = {
    nama,
    updated_at: new Date().toISOString(),
  };
  if (no_hp !== undefined) {
    payload.no_hp = no_hp || null;
  }

  let { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profile.id);

  // Fallback if no_hp column not yet present in remote DB
  if (error && error.message.includes("no_hp")) {
    delete payload.no_hp;
    const fallback = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id);
    error = fallback.error;
  }

  if (error) {
    return {
      success: false,
      error: `Gagal memperbarui profil: ${error.message}`,
    };
  }

  // Synchronize Auth user metadata
  await supabase.auth.updateUser({
    data: { nama, no_hp: no_hp || null },
  });

  revalidatePath("/admin/pengaturan");
  revalidatePath("/vendor/pengaturan");
  return { success: true, message: "Profil berhasil diperbarui" };
}

// Change current authenticated user's password with old password verification
export async function changeSelfPasswordAction(
  input: ChangeSelfPasswordInput
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Sesi tidak ditemukan. Silakan login kembali." };
  }

  const parsed = changeSelfPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validasi password gagal",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, error: "Informasi akun login tidak valid" };
  }

  // Verify old password by attempting authentication
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (authErr) {
    return {
      success: false,
      error: "Password saat ini salah. Pastikan password lama Anda sudah benar.",
    };
  }

  // Update password to new password
  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateErr) {
    return {
      success: false,
      error: `Gagal mengubah password: ${updateErr.message}`,
    };
  }

  return { success: true, message: "Password berhasil diperbarui" };
}

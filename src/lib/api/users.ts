// Typed client API methods for calling /api/users route handlers
import { CreateUserInput, UpdateUserInput, ResetPasswordInput } from "@/lib/validations/user";
import { AppRole } from "@/lib/types";

export interface UserRecord {
  id: string;
  username: string;
  nama: string;
  role: AppRole;
  vendor_id: string | null;
  no_hp?: string | null;
  aktif: boolean;
  created_at: string;
  updated_at: string;
  vendors?: {
    id: string;
    kode: string;
    nama: string;
  } | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Fetch user list from administrative endpoint
export async function fetchUsersApi(): Promise<ApiResponse<UserRecord[]>> {
  try {
    const res = await fetch("/api/users", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const json = await res.json();
    return json;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghubungi server";
    return { success: false, error: msg, data: [] };
  }
}

// Create new user account through administrative API
export async function createUserApi(input: CreateUserInput): Promise<ApiResponse<UserRecord>> {
  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    return json;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membuat pengguna";
    return { success: false, error: msg };
  }
}

// Update existing user attributes through administrative API
export async function updateUserApi(input: UpdateUserInput): Promise<ApiResponse> {
  try {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    return json;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui pengguna";
    return { success: false, error: msg };
  }
}

// Reset target user password through administrative API
export async function resetUserPasswordApi(input: ResetPasswordInput): Promise<ApiResponse> {
  try {
    const res = await fetch("/api/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    return json;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mereset password";
    return { success: false, error: msg };
  }
}

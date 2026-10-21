// Pure business rule guards for user account role modification and deactivation
import { AppRole } from "@/lib/types";

export interface UserGuardTarget {
  id: string;
  role: AppRole;
  aktif: boolean;
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

// Format username into official corporate authentication email
export function formatAuthEmail(username: string): string {
  return `${username.toLowerCase().trim()}@tps.co.id`;
}

// Validate whether a user can be deactivated
export function canDeactivateUser(
  targetUser: UserGuardTarget,
  currentUserId: string,
  allUsers: UserGuardTarget[]
): GuardResult {
  if (targetUser.id === currentUserId) {
    return {
      allowed: false,
      reason: "Tidak dapat menonaktifkan akun sendiri",
    };
  }

  if (targetUser.role === "admin_ga" && targetUser.aktif) {
    const remainingActiveAdmins = allUsers.filter(
      (u) => u.id !== targetUser.id && u.role === "admin_ga" && u.aktif
    ).length;

    if (remainingActiveAdmins <= 0) {
      return {
        allowed: false,
        reason: "Minimal harus ada satu Admin GA aktif tersisa",
      };
    }
  }

  return { allowed: true };
}

// Validate whether a user role can be modified
export function canChangeUserRole(
  targetUser: UserGuardTarget,
  newRole: AppRole,
  currentUserId: string,
  allUsers: UserGuardTarget[]
): GuardResult {
  if (targetUser.role === newRole) {
    return { allowed: true };
  }

  if (targetUser.id === currentUserId && targetUser.role === "admin_ga" && newRole !== "admin_ga") {
    return {
      allowed: false,
      reason: "Tidak dapat menurunkan role akun sendiri",
    };
  }

  if (targetUser.role === "admin_ga" && newRole !== "admin_ga" && targetUser.aktif) {
    const remainingActiveAdmins = allUsers.filter(
      (u) => u.id !== targetUser.id && u.role === "admin_ga" && u.aktif
    ).length;

    if (remainingActiveAdmins <= 0) {
      return {
        allowed: false,
        reason: "Minimal harus ada satu Admin GA aktif tersisa",
      };
    }
  }

  return { allowed: true };
}

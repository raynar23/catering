// Unit tests for user guard business rules
import { describe, it, expect } from "vitest";
import {
  formatAuthEmail,
  canDeactivateUser,
  canChangeUserRole,
  UserGuardTarget,
} from "./user-guard";

describe("formatAuthEmail", () => {
  it("formats username to lowercase tps corporate email", () => {
    expect(formatAuthEmail("Admin.GA")).toBe("admin.ga@tps.co.id");
    expect(formatAuthEmail("  vendor.aisya  ")).toBe("vendor.aisya@tps.co.id");
  });
});

describe("canDeactivateUser", () => {
  const users: UserGuardTarget[] = [
    { id: "admin-1", role: "admin_ga", aktif: true },
    { id: "admin-2", role: "admin_ga", aktif: true },
    { id: "vendor-1", role: "vendor", aktif: true },
  ];

  it("prevents self-deactivation", () => {
    const res = canDeactivateUser(users[0], "admin-1", users);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("Tidak dapat menonaktifkan akun sendiri");
  });

  it("allows deactivation when other active admins exist", () => {
    const res = canDeactivateUser(users[1], "admin-1", users);
    expect(res.allowed).toBe(true);
  });

  it("blocks deactivation of the last active admin", () => {
    const singleAdminList: UserGuardTarget[] = [
      { id: "admin-1", role: "admin_ga", aktif: true },
      { id: "vendor-1", role: "vendor", aktif: true },
    ];
    const res = canDeactivateUser(singleAdminList[0], "caller-admin", singleAdminList);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("Minimal harus ada satu Admin GA aktif tersisa");
  });

  it("allows deactivating vendor accounts", () => {
    const res = canDeactivateUser(users[2], "admin-1", users);
    expect(res.allowed).toBe(true);
  });
});

describe("canChangeUserRole", () => {
  const users: UserGuardTarget[] = [
    { id: "admin-1", role: "admin_ga", aktif: true },
    { id: "admin-2", role: "admin_ga", aktif: true },
    { id: "vendor-1", role: "vendor", aktif: true },
  ];

  it("prevents self role demotion from admin_ga to vendor", () => {
    const res = canChangeUserRole(users[0], "vendor", "admin-1", users);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("Tidak dapat menurunkan role akun sendiri");
  });

  it("allows demoting another admin if other active admins exist", () => {
    const res = canChangeUserRole(users[1], "vendor", "admin-1", users);
    expect(res.allowed).toBe(true);
  });

  it("blocks demoting the last active admin to vendor", () => {
    const singleAdminList: UserGuardTarget[] = [
      { id: "admin-1", role: "admin_ga", aktif: true },
      { id: "vendor-1", role: "vendor", aktif: true },
    ];
    const res = canChangeUserRole(singleAdminList[0], "vendor", "caller-admin", singleAdminList);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("Minimal harus ada satu Admin GA aktif tersisa");
  });

  it("allows promoting a vendor to admin_ga", () => {
    const res = canChangeUserRole(users[2], "admin_ga", "admin-1", users);
    expect(res.allowed).toBe(true);
  });
});

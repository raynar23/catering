// Unit tests for user validation schemas
import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  updateSelfProfileSchema,
  changeSelfPasswordSchema,
} from "./user";

describe("createUserSchema", () => {
  it("accepts valid admin_ga user creation data", () => {
    const res = createUserSchema.safeParse({
      nama: "Admin Baru",
      username: "admin.baru",
      password: "password123",
      role: "admin_ga",
      no_hp: "081234567890",
    });
    expect(res.success).toBe(true);
  });

  it("accepts valid vendor user with vendor_id", () => {
    const res = createUserSchema.safeParse({
      nama: "Vendor Baru",
      username: "vendor.baru",
      password: "password123",
      role: "vendor",
      vendor_id: "724eccc2-9331-4812-b6d4-0576553374ca",
    });
    expect(res.success).toBe(true);
  });

  it("rejects vendor role without vendor_id", () => {
    const res = createUserSchema.safeParse({
      nama: "Vendor Baru",
      username: "vendor.baru",
      password: "password123",
      role: "vendor",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe("Akun vendor wajib memilih vendor");
    }
  });

  it("rejects invalid username characters or short password", () => {
    const res1 = createUserSchema.safeParse({
      nama: "User Test",
      username: "User Dengan Spasi",
      password: "password123",
      role: "admin_ga",
    });
    expect(res1.success).toBe(false);

    const res2 = createUserSchema.safeParse({
      nama: "User Test",
      username: "usertest",
      password: "123",
      role: "admin_ga",
    });
    expect(res2.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts valid update input", () => {
    const res = updateUserSchema.safeParse({
      id: "724eccc2-9331-4812-b6d4-0576553374ca",
      nama: "Nama Diperbarui",
      role: "admin_ga",
      aktif: true,
    });
    expect(res.success).toBe(true);
  });

  it("rejects update to vendor role without vendor_id", () => {
    const res = updateUserSchema.safeParse({
      id: "724eccc2-9331-4812-b6d4-0576553374ca",
      nama: "Nama Diperbarui",
      role: "vendor",
    });
    expect(res.success).toBe(false);
  });
});

describe("resetPasswordSchema and self-service schemas", () => {
  it("validates reset password minimum length", () => {
    const res = resetPasswordSchema.safeParse({
      userId: "724eccc2-9331-4812-b6d4-0576553374ca",
      newPassword: "short",
    });
    expect(res.success).toBe(false);
  });

  it("validates change self password confirmation match", () => {
    const valid = changeSelfPasswordSchema.safeParse({
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    });
    expect(valid.success).toBe(true);

    const mismatch = changeSelfPasswordSchema.safeParse({
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
      confirmPassword: "differentpassword",
    });
    expect(mismatch.success).toBe(false);
  });

  it("validates self profile update format", () => {
    const res = updateSelfProfileSchema.safeParse({
      nama: "Muhammad Raynar",
      no_hp: "081234567890",
    });
    expect(res.success).toBe(true);
  });
});

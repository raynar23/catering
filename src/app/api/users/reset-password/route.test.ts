import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

describe("POST /api/users/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({ data: { user: null }, error: new Error("Unauthorized") }),
      },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/users/reset-password", {
      method: "POST",
      body: JSON.stringify({ userId: "11111111-1111-1111-1111-111111111111", newPassword: "password123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain("Sesi tidak valid");
  });

  it("returns 403 when user is not active admin_ga", async () => {
    vi.mocked(createServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({
          data: { user: { id: "user-vendor-id" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "user-vendor-id", role: "vendor", aktif: true },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const req = new NextRequest("http://localhost:3000/api/users/reset-password", {
      method: "POST",
      body: JSON.stringify({ userId: "11111111-1111-1111-1111-111111111111", newPassword: "password123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain("Akses ditolak");
  });

  it("returns 400 when validation fails", async () => {
    vi.mocked(createServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({
          data: { user: { id: "admin-id" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "admin-id", role: "admin_ga", aktif: true },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const req = new NextRequest("http://localhost:3000/api/users/reset-password", {
      method: "POST",
      body: JSON.stringify({ userId: "invalid-uuid", newPassword: "123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("resets password successfully when caller is active admin_ga and data is valid", async () => {
    vi.mocked(createServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({
          data: { user: { id: "admin-id" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "admin-id", username: "admin", role: "admin_ga", aktif: true },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const mockUpdateUserById = vi.fn().mockResolvedValueOnce({ error: null });
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "11111111-1111-1111-1111-111111111111", username: "target_user", nama: "Target User" },
              error: null,
            }),
          }),
        }),
      }),
      auth: {
        admin: {
          updateUserById: mockUpdateUserById,
        },
      },
    } as any);

    const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const req = new NextRequest("http://localhost:3000/api/users/reset-password", {
      method: "POST",
      body: JSON.stringify({ userId: validUuid, newPassword: "passwordBaru123" }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain("berhasil direset");
    expect(mockUpdateUserById).toHaveBeenCalledWith(validUuid, {
      password: "passwordBaru123",
    });
  });
});

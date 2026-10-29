// Unit test for VendorSecurityConfirmDialog security checks and navigation
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { VendorSecurityConfirmDialog } from "./VendorSecurityConfirmDialog";

describe("VendorSecurityConfirmDialog Component", () => {
  const dummyNewVendors = ["Catering IBU", "Nikmat Rasa", "Adhi Hidayah", "Nurina Catering"];

  it("renders nothing when isOpen is false", () => {
    const html = renderToString(
      <VendorSecurityConfirmDialog
        isOpen={false}
        onClose={vi.fn()}
        newVendors={dummyNewVendors}
        onConfirmAutoRegister={vi.fn()}
      />
    );
    expect(html).toBe("");
  });

  it("renders security warnings and list of detected unmapped vendors when isOpen is true", () => {
    const html = renderToString(
      <VendorSecurityConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        newVendors={dummyNewVendors}
        onConfirmAutoRegister={vi.fn()}
      />
    );

    expect(html).toContain("Konfirmasi Keamanan: Mitra Vendor Belum Terdaftar");
    expect(html).toContain("Keamanan &amp; Multi-Tenant");
    expect(html).toContain("4 Vendor Baru");
    expect(html).toContain("Catering IBU");
    expect(html).toContain("Nikmat Rasa");
    expect(html).toContain("Adhi Hidayah");
    expect(html).toContain("Nurina Catering");
  });

  it("renders Option 1 links pointing to master vendor and user management", () => {
    const html = renderToString(
      <VendorSecurityConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        newVendors={dummyNewVendors}
        onConfirmAutoRegister={vi.fn()}
      />
    );

    expect(html).toContain('href="/admin/master/vendor"');
    expect(html).toContain('href="/admin/manajemen-user"');
    expect(html).toContain("Buka Data Vendor");
    expect(html).toContain("Buka Manajemen User");
    expect(html).toContain("Tetap Lanjut &amp; Buat Akun Otomatis");
  });
});

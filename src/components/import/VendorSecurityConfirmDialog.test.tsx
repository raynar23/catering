// Unit test for minimalist VendorSecurityConfirmDialog
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

  it("renders vendor names and concise explanation when isOpen is true", () => {
    const html = renderToString(
      <VendorSecurityConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        newVendors={dummyNewVendors}
        onConfirmAutoRegister={vi.fn()}
      />
    );

    expect(html).toContain("Vendor Belum Terdaftar");
    expect(html).toContain("4 vendor");
    expect(html).toContain("Catering IBU");
    expect(html).toContain("Nikmat Rasa");
    expect(html).toContain("Adhi Hidayah");
    expect(html).toContain("Nurina Catering");
  });

  it("renders clean manual links and proceed button", () => {
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
    expect(html).toContain("Data Vendor");
    expect(html).toContain("Manajemen User");
    expect(html).toContain("Lanjut &amp; Buat Akun Otomatis");
  });
});

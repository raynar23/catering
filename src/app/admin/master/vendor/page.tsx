import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { VendorTable } from "@/components/admin/VendorTable";

export const metadata = {
  title: "Data Vendor | Sistem Pengelolaan Data Catering Karyawan",
};

// Vendor master management page for Admin GA
export default function AdminMasterVendorPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Data Vendor"
        subtitle="Kelola master data rekanan penyedia catering, urutan rotasi, dan kontak WhatsApp"
      />
      <VendorTable />
    </PageContainer>
  );
}

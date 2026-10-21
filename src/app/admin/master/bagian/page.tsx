import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { BagianTable } from "@/components/admin/BagianTable";

export const metadata = {
  title: "Data Bagian | Sistem Pengelolaan Data Catering Karyawan",
};

// Bagian master management page for Admin GA
export default function AdminMasterBagianPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Data Bagian"
        subtitle="Kelola master data bagian kerja operasional dan lokasi distribusi catering"
      />
      <BagianTable />
    </PageContainer>
  );
}

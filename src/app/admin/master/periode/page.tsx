import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { PeriodTable } from "@/components/admin/PeriodTable";

export const metadata = {
  title: "Periode Catering | Sistem Pengelolaan Data Catering Karyawan",
};

// Period scheduling management page for Admin GA
export default function AdminMasterPeriodePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Periode Catering"
        subtitle="Jadwal operasional harian, alokasi vendor catering per shift, dan pengelolaan jam kerja"
      />
      <PeriodTable />
    </PageContainer>
  );
}

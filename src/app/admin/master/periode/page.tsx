import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// Catering delivery periods and shift scheduling placeholder page
export default function AdminMasterPeriodePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Periode Catering"
        subtitle="Jadwal operasional harian, jam shift kerja, dan penugasan vendor"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Master Periode & Shift"
          description="Kalender penetapan periode pesanan harian (Shift 1, 2, 3) dan kalkulasi otomatis vendor rotasi terjadwal akan aktif pada Tahap 04."
        />
      </div>
    </PageContainer>
  );
}

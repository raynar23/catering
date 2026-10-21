import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateLong } from "@/lib/format";

// Dashboard overview placeholder displaying system status and upcoming metrics
export default function AdminDashboardPage() {
  const todayStr = formatDateLong(new Date());

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle={todayStr}
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Dashboard Siap Digunakan"
          description="Ringkasan indikator kinerja utama, grafik distribusi per shift, dan rekapitulasi kebutuhan catering harian akan aktif secara penuh pada tahap integrasi data operasional."
        />
      </div>
    </PageContainer>
  );
}

import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateLong } from "@/lib/format";

// Vendor dashboard placeholder displaying assigned shifts and delivery status
export default function VendorDashboardPage() {
  const todayStr = formatDateLong(new Date());

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard Vendor"
        subtitle={todayStr}
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Portal Vendor Siap Digunakan"
          description="Informasi alokasi pesanan hari ini, total porsi per bagian kerja, serta pembaruan progres pengiriman (dipersiapkan, dikirim, sampai) akan terhubung pada tahap integrasi vendor."
        />
      </div>
    </PageContainer>
  );
}

import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// Matrix recapitulation placeholder page for consolidated portion counts
export default function AdminRekapitulasiPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Rekapitulasi"
        subtitle="Matriks konsolidasi data catering per shift dan bagian kerja"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Modul Rekapitulasi Data"
          description="Tabel matriks per bagian dan shift, baris total periode, serta filter tanggal dinamis akan terhubung dengan view v_rekap pada Tahap 07."
        />
      </div>
    </PageContainer>
  );
}

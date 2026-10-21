import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// Reporting and document export placeholder page for Excel and PDF files
export default function AdminLaporanPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Laporan"
        subtitle="Penyusunan laporan berkala dan ekspor dokumen format Excel dan PDF resmi"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Modul Laporan dan Ekspor"
          description="Pilihan rekap harian, mingguan, bulanan serta fungsi cetak PDF berlogo dan ekspor Excel terstruktur akan diaktifkan pada Tahap 07."
        />
      </div>
    </PageContainer>
  );
}

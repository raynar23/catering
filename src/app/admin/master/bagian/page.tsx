import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// Operational department master data placeholder page
export default function AdminMasterBagianPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Data Bagian"
        subtitle="Manajemen data bagian kerja operasional dan lokasi distribusi catering"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Master Data Bagian Kerja"
          description="Tabel pengelolaan nama bagian, kode urutan, lokasi pengantaran, dan status aktif akan diimplementasikan pada Tahap 04."
        />
      </div>
    </PageContainer>
  );
}

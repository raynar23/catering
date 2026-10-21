import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// Catering supplier vendor master data placeholder page
export default function AdminMasterVendorPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Data Vendor"
        subtitle="Manajemen rekanan penyedia jasa catering, kontak, dan urutan rotasi"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Master Data Vendor Catering"
          description="Pengaturan profil vendor rekanan (V001 - V005), nomor kontak, alamat operasional, dan parameter rotasi akan diaktifkan pada Tahap 04."
        />
      </div>
    </PageContainer>
  );
}

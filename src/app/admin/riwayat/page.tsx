import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// Order verification and chronological audit log placeholder page
export default function AdminRiwayatPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Verifikasi & Riwayat"
        subtitle="Persetujuan pesanan, penanganan revisi porsi, dan kronologi perubahan data"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Modul Verifikasi & Riwayat"
          description="Alur persetujuan atau penolakan pesanan diajukan, verifikasi revisi porsi, dan riwayat jejak audit lengkap akan diaktifkan pada Tahap 06."
        />
      </div>
    </PageContainer>
  );
}

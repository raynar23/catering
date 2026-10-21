import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// Catering order input placeholder page for daily portion submission
export default function AdminInputPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Input Data Catering"
        subtitle="Pencatatan dan pengajuan data kebutuhan catering per bagian dan shift"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Modul Input Data Catering"
          description="Formulir entri porsi per bagian aktif, pemilihan vendor rotasi otomatis, dan fitur simpan draft maupun ajukan pesanan akan diimplementasikan pada Tahap 05."
        />
      </div>
    </PageContainer>
  );
}

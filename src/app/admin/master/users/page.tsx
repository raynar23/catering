import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// User account management placeholder page for Admin GA
export default function AdminMasterUsersPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Manajemen User"
        subtitle="Pengelolaan akun pengguna internal Admin GA dan akun perwakilan vendor"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Manajemen Akun Pengguna"
          description="Pembuatan akun baru terautentikasi (@tps.co.id), pembaruan data pengguna, dan aktivasi/nonaktivasi akun akan diimplementasikan pada Tahap 04."
        />
      </div>
    </PageContainer>
  );
}

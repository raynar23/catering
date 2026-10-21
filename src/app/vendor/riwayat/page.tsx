import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// Vendor order history and delivery confirmation placeholder page
export default function VendorRiwayatPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Pesanan & Riwayat"
        subtitle="Daftar seluruh pesanan catering yang dialokasikan dan status konfirmasi"
      />
      <div className="flex-1 min-h-0 flex flex-col justify-center bg-surface border border-border rounded-[10px] mt-4 p-6">
        <EmptyState
          title="Riwayat Pesanan Vendor"
          description="Daftar pesanan masa lalu dan mendatang, respons kesanggupan pengiriman, serta arsip dokumen pengantaran makanan akan aktif pada tahap integrasi vendor."
        />
      </div>
    </PageContainer>
  );
}

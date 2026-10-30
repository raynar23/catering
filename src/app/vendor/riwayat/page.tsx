import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVendorRiwayatList } from "@/lib/actions/vendor-portal";
import { RiwayatTable } from "@/components/vendor/RiwayatTable";

export const metadata = {
  title: "Riwayat Pesanan | Portal Vendor Catering TPS",
};

// Vendor historical order archive page with date filtering and department inspection
export default async function VendorRiwayatPage() {
  const rows = await getVendorRiwayatList();

  return (
    <PageContainer>
      <PageHeader
        title="Riwayat Pesanan"
        subtitle="Arsip seluruh pesanan katering masa lalu dan status penyelesaian pengiriman"
      />

      <div className="mt-2.5 sm:mt-3 flex-1 min-h-0 flex flex-col">
        <RiwayatTable initialRows={rows} />
      </div>
    </PageContainer>
  );
}

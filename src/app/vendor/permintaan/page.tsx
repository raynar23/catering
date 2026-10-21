import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVendorPermintaanList } from "@/lib/actions/vendor-portal";
import { PermintaanTable } from "@/components/vendor/PermintaanTable";

export const metadata = {
  title: "Permintaan Masuk | Portal Vendor Catering TPS",
};

// Vendor incoming final requests management page with inspector view
export default async function VendorPermintaanPage() {
  const rows = await getVendorPermintaanList();

  return (
    <PageContainer>
      <PageHeader
        title="Permintaan Masuk"
        subtitle="Daftar seluruh pesanan katering final yang dialokasikan ke vendor Anda beserta rincian bagian"
      />

      <div className="mt-4 flex-1 min-h-0 flex flex-col">
        <PermintaanTable initialRows={rows} />
      </div>
    </PageContainer>
  );
}

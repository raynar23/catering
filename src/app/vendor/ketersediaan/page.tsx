import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVendorKetersediaanQueue } from "@/lib/actions/vendor-portal";
import { KetersediaanQueue } from "@/components/vendor/KetersediaanQueue";

export const metadata = {
  title: "Konfirmasi Ketersediaan | Portal Vendor Catering TPS",
};

// Vendor confirmation queue for unresponded incoming requests and revisions
export default async function VendorKetersediaanPage() {
  const queue = await getVendorKetersediaanQueue();

  return (
    <PageContainer>
      <PageHeader
        title="Konfirmasi Ketersediaan"
        subtitle="Antrean permintaan jadwal katering dan pengajuan revisi kuota yang membutuhkan konfirmasi"
      />

      <div className="mt-2.5 sm:mt-3 flex-1 min-h-0 flex flex-col">
        <KetersediaanQueue
          orders={queue.orders}
          revisions={queue.revisions}
        />
      </div>
    </PageContainer>
  );
}

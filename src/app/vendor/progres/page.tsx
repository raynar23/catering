import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVendorProgresList } from "@/lib/actions/vendor-portal";
import { ProgresWorkflowCard } from "@/components/vendor/ProgresWorkflowCard";

export const metadata = {
  title: "Progres Pengiriman | Portal Vendor Catering TPS",
};

// Vendor delivery progress tracking page for advancing stages from preparation to completion
export default async function VendorProgresPage() {
  const orders = await getVendorProgresList();

  return (
    <PageContainer>
      <PageHeader
        title="Progres Pengiriman"
        subtitle="Pemantauan alur produksi dan pembaruan tahapan pengantaran katering ke terminal kerja"
      />

      <div className="mt-2.5 sm:mt-3 flex-1 min-h-0 flex flex-col">
        <ProgresWorkflowCard orders={orders} />
      </div>
    </PageContainer>
  );
}

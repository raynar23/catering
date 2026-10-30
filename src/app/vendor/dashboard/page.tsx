import React from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVendorDashboardData } from "@/lib/actions/vendor-portal";
import { VendorKPICards } from "@/components/vendor/VendorKPICards";
import { PesananHariIniPanel } from "@/components/vendor/PesananHariIniPanel";
import { formatDateLong } from "@/lib/format";

export const metadata = {
  title: "Dashboard Vendor | Portal Katering Pelindo TPS",
};

// Vendor operational dashboard displaying daily summary metrics and 3-shift workload
export default async function VendorDashboardPage() {
  const data = await getVendorDashboardData();
  const todayFormatted = formatDateLong(new Date());

  return (
    <PageContainer scrollable>
      <PageHeader
        title={`Dashboard Vendor: ${data.vendorNama}`}
        subtitle={`Ringkasan operasional dan jadwal pesanan ${todayFormatted}`}
      />

      <div className="mt-2.5 sm:mt-3 flex flex-col flex-1 min-h-0 gap-3 sm:gap-3.5">
        {/* 4 Summary KPI Cards */}
        <VendorKPICards kpis={data.kpis} />

        {/* 3 Shifts Today Operational Panel */}
        <PesananHariIniPanel
          shifts={data.shiftsToday}
          todayFormatted={todayFormatted}
        />
      </div>
    </PageContainer>
  );
}

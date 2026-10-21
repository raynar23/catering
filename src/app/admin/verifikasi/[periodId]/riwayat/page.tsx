import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChronologyView } from "@/components/verifikasi/ChronologyView";
import { getOrderChronology } from "@/lib/actions/revisi";

export const metadata: Metadata = {
  title: "Riwayat Kronologi Pesanan | Catering TPS Surabaya",
  description: "Kronologi lengkap jejak audit pesanan catering, perubahan porsi, dan aktivitas vendor",
};

export default async function AdminOrderChronologyPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = await params;
  const chronology = await getOrderChronology(periodId);

  if (!chronology) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeader
        title="Riwayat Kronologi Pesanan"
        subtitle="Jejak audit seluruh perubahan status, penyesuaian porsi, dan catatan aktivitas pesanan"
      />
      <div className="flex-1 min-h-0 flex flex-col mt-3">
        <ChronologyView data={chronology} />
      </div>
    </PageContainer>
  );
}

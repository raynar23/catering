import React from "react";
import { Metadata } from "next";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { VerifikasiView } from "@/components/verifikasi/VerifikasiView";
import {
  getVerificationRevisionsList,
  getVendorResponseFollowUpList,
} from "@/lib/actions/revisi";

export const metadata: Metadata = {
  title: "Verifikasi Data & Respons Vendor | Catering TPS Surabaya",
  description: "Persetujuan perubahan kuota revisi porsi dan tindak lanjut penolakan pesanan mitra vendor",
};

export default async function AdminVerifikasiPage() {
  const [revisions, vendorResponses] = await Promise.all([
    getVerificationRevisionsList(),
    getVendorResponseFollowUpList(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Verifikasi Data"
        subtitle="Persetujuan pengajuan revisi porsi dan penanganan tindak lanjut respons mitra vendor"
      />
      <div className="flex-1 min-h-0 flex flex-col mt-3">
        <VerifikasiView
          initialRevisions={revisions}
          initialVendorResponses={vendorResponses}
        />
      </div>
    </PageContainer>
  );
}

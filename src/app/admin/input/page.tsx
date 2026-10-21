import React from "react";
import { Metadata } from "next";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { CateringInputView } from "@/components/catering/CateringInputView";
import { getDateCateringData } from "@/lib/actions/catering";
import { getTomorrowDateIso } from "@/lib/date";

export const metadata: Metadata = {
  title: "Input Data Catering | Catering TPS Surabaya",
  description: "Matriks pengisian kebutuhan porsi catering per bagian untuk tiga shift harian",
};

export default async function AdminInputPage() {
  const tomorrowIso = getTomorrowDateIso();
  const initialData = await getDateCateringData(tomorrowIso);

  return (
    <PageContainer>
      <PageHeader
        title="Input Data Catering"
        subtitle="Matriks pengisian kebutuhan porsi harian per bagian untuk tiga shift operasional terminal"
      />
      <div className="flex-1 min-h-0 flex flex-col mt-3">
        <CateringInputView initialData={initialData} />
      </div>
    </PageContainer>
  );
}

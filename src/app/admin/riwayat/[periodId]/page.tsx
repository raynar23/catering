import { permanentRedirect } from "next/navigation";

export default async function AdminRiwayatRedirectPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = await params;
  permanentRedirect(`/admin/verifikasi/${periodId}/riwayat`);
}

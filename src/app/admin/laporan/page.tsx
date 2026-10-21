import { redirect } from "next/navigation";

// Unified reporting route redirecting to the consolidated rekapitulasi and export dashboard
export default function AdminLaporanPage() {
  redirect("/admin/rekapitulasi");
}

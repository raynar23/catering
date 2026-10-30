import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import { AppShell } from "@/components/layout/AppShell";
import { getPendingRevisionsCount } from "@/lib/actions/revisi";

export const metadata = {
  title: "Admin GA | Sistem Pengelolaan Data Catering Karyawan",
};

// Root layout for Admin GA portal enforcing role isolation, badges, and AppShell wrapping
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, pendingCount] = await Promise.all([
    getCurrentProfile(),
    getPendingRevisionsCount(),
  ]);

  if (!profile || !profile.aktif) {
    redirect("/login");
  }

  if (profile.role !== "admin_ga") {
    redirect("/vendor/dashboard");
  }

  return (
    <AppShell profile={profile} badges={{ pendingCount }}>
      {children}
    </AppShell>
  );
}


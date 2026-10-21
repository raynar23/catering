import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Admin GA | Sistem Pengelolaan Data Catering Karyawan",
};

// Root layout for Admin GA portal enforcing role isolation and AppShell wrapping
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || !profile.aktif) {
    redirect("/login");
  }

  if (profile.role !== "admin_ga") {
    redirect("/vendor/dashboard");
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}

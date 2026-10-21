import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import { AppShell } from "@/components/layout/AppShell";
import { getVendorNotificationCounts } from "@/lib/actions/vendor-portal";

export const metadata = {
  title: "Portal Vendor | Sistem Pengelolaan Data Catering Karyawan",
};

// Root layout for Vendor portal enforcing role isolation and AppShell wrapping
export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || !profile.aktif) {
    redirect("/login");
  }

  if (profile.role !== "vendor") {
    redirect("/admin/dashboard");
  }

  const unrespondedCount = await getVendorNotificationCounts();

  return (
    <AppShell
      profile={profile}
      badges={{
        pendingVendorConfirmation: unrespondedCount,
        pendingCount: unrespondedCount,
      }}
    >
      {children}
    </AppShell>
  );
}

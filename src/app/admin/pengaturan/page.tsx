import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileSettingsView } from "@/components/profile/ProfileSettingsView";

// Settings page for Admin GA users
export default async function AdminPengaturanPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    redirect("/login");
  }

  return (
    <PageContainer>
      <PageHeader
        title="Pengaturan Akun"
        subtitle="Kelola profil pribadi dan keamanan kata sandi Admin GA"
      />
      <div className="flex-1 min-h-0 flex flex-col mt-4">
        <ProfileSettingsView profile={profile} />
      </div>
    </PageContainer>
  );
}

import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserTable } from "@/components/admin/UserTable";

// Server page component for administrative user account management
export default async function AdminManajemenUserPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    redirect("/login");
  }

  return (
    <PageContainer>
      <PageHeader
        title="Manajemen User"
        subtitle="Kelola akun login internal Admin GA dan perwakilan vendor catering"
      />
      <div className="flex-1 min-h-0 flex flex-col mt-4">
        <UserTable currentUserId={profile.id} />
      </div>
    </PageContainer>
  );
}

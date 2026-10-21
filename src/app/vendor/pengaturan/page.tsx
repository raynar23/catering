import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileSettingsView } from "@/components/profile/ProfileSettingsView";

// Settings page for Vendor partner users
export default async function VendorPengaturanPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "vendor") {
    redirect("/login");
  }

  let vendorName: string | null = null;
  if (profile.vendor_id) {
    const supabase = await createClient();
    const { data: vendor } = await supabase
      .from("vendors")
      .select("nama, kode")
      .eq("id", profile.vendor_id)
      .maybeSingle();

    if (vendor) {
      vendorName = `${vendor.nama} (${vendor.kode})`;
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Pengaturan Akun"
        subtitle="Kelola profil perwakilan dan keamanan kata sandi vendor catering"
      />
      <div className="flex-1 min-h-0 flex flex-col mt-4">
        <ProfileSettingsView profile={profile} vendorName={vendorName} />
      </div>
    </PageContainer>
  );
}

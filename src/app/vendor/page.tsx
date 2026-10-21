import { redirect } from "next/navigation";

// Root vendor route redirects directly to vendor dashboard
export default function VendorRootPage() {
  redirect("/vendor/dashboard");
}

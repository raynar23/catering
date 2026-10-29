import { redirect } from "next/navigation";

// Alias redirect from /admin/catering to /admin/input
export default function AdminCateringRedirectPage() {
  redirect("/admin/input");
}

import { redirect } from "next/navigation";

// Root admin index redirecting automatically to dashboard
export default function AdminPage() {
  redirect("/admin/dashboard");
}

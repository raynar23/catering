import { redirect } from "next/navigation";

// Redirect legacy route /admin/master/users to /admin/manajemen-user
export default function AdminMasterUsersRedirect() {
  redirect("/admin/manajemen-user");
}

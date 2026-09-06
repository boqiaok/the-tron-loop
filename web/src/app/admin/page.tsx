import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function AdminPage() {
  await requireAdminSession();
  redirect("/admin/activities");
}

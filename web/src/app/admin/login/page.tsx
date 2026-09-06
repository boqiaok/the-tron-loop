import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { ApiError, getAdminSession } from "@/lib/api/admin-activities";
import { getAdminRequestContext } from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const context = await getAdminRequestContext();
  try {
    await getAdminSession(context);
    redirect("/admin/activities");
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }

  return (
    <main className="mx-auto flex max-w-md flex-1 items-center px-5 py-16 sm:px-8">
      <section className="w-full rounded-xl border bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-[0.14em] text-[var(--gold)] uppercase">
          Administration
        </p>
        <h1 className="mt-1 font-heading text-4xl text-primary">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use an administrator account to manage activity listings.
        </p>
        <AdminLoginForm />
      </section>
    </main>
  );
}

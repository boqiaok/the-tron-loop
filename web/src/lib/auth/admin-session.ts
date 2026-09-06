import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ApiError,
  getAdminSession,
  type AdminRequestContext,
  type AdminSession,
} from "@/lib/api/admin-activities";

export async function getAdminRequestContext(): Promise<AdminRequestContext> {
  const cookieStore = await cookies();
  return { cookie: cookieStore.toString() };
}

export async function requireAdminSession(): Promise<{
  context: AdminRequestContext;
  session: AdminSession;
}> {
  const context = await getAdminRequestContext();
  try {
    return { context, session: await getAdminSession(context) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/admin/login");
    }
    throw error;
  }
}

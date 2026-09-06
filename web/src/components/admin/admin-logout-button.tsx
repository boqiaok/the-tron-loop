"use client";

import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { logoutAdmin } from "@/lib/api/admin-activities";

export function AdminLogoutButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (pathname === "/admin/login") return null;

  async function logout() {
    setPending(true);
    try {
      await logoutAdmin();
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={logout} disabled={pending}>
      <LogOut />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

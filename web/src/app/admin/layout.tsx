import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { BrandMark } from "@/components/layout/brand-logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f5f6f4]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/admin/activities"
            className="inline-flex items-center gap-3 font-semibold text-primary"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-[#1F2A44]">
              <BrandMark className="size-6" />
            </span>
            <span>
              <span className="block text-base leading-tight">
                whatson
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                Activity administration
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-3 text-sm font-medium sm:flex">
              <Link href="/admin/review" className="hover:underline">Review</Link>
              <Link href="/admin/activities" className="hover:underline">Activities</Link>
              <Link href="/admin/picks" className="hover:underline">Picks</Link>
              <Link href="/admin/sources" className="hover:underline">Sources</Link>
            </nav>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--link)] hover:underline"
            >
              View public site
              <ExternalLink className="size-3.5" />
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

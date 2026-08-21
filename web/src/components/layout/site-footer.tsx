import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-primary text-primary-foreground">
      <div className="grid gap-8 px-5 py-8 sm:px-10 md:grid-cols-[1fr_auto_auto] md:items-center lg:px-12">
        <BrandLogo inverse tagline />
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-7 gap-y-3 text-xs"
        >
          <Link href="/this-week" className="hover:underline">
            This Week
          </Link>
          <Link href="/next-week" className="hover:underline">
            Next Week
          </Link>
          <span className="opacity-70">Regular Activities</span>
          <Link href="/about" className="hover:underline">
            About
          </Link>
        </nav>
        <p className="text-xs opacity-80">© 2026 The Tron Loop</p>
      </div>
    </footer>
  );
}

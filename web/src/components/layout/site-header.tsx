"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Plan", match: (path: string) => path === "/" || path === "/plan" },
  { href: "/whats-on", label: "What’s on", match: (path: string) => path === "/whats-on" || path.startsWith("/activities/") },
  { href: "/about", label: "About", match: (path: string) => path === "/about" },
];

/** Three destinations only: Plan, What’s on and About. */
export function SiteHeader() {
  const pathname = usePathname();
  const [plan, whatsOn, about] = NAV_ITEMS;

  return (
    <header
      className={cn(
        "border-b bg-card",
        pathname.startsWith("/activities/") && "max-md:hidden",
      )}
    >
      {/* Desktop: pill navigation in a 68px bar */}
      <div className="mx-auto hidden h-[68px] max-w-[1120px] items-center justify-between px-8 md:flex">
        <Link href="/" aria-label="The Tron Loop home" className="hover:no-underline">
          <BrandLogo />
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-[15px] hover:no-underline",
                  active
                    ? "bg-secondary font-medium text-foreground hover:text-foreground"
                    : "text-body hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile: logo + About, then a two-column Plan / What’s on tab bar.
          Detail pages hide it and show their own back bar instead. */}
      <div className="md:hidden">
        <div className="flex h-14 items-center justify-between px-[18px]">
          <Link href="/" aria-label="The Tron Loop home" className="hover:no-underline">
            <BrandLogo compact />
          </Link>
          <Link
            href={about.href}
            aria-current={about.match(pathname) ? "page" : undefined}
            className={cn(
              "text-[13px] hover:no-underline",
              about.match(pathname) ? "font-semibold text-foreground" : "text-meta",
            )}
          >
            {about.label}
          </Link>
        </div>
        <nav aria-label="Main navigation" className="grid grid-cols-2">
          {[plan, whatsOn].map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 py-[13px] text-center text-[15px] hover:no-underline",
                  active
                    ? "border-primary font-semibold text-foreground hover:text-foreground"
                    : "border-transparent text-meta hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

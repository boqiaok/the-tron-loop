"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-20 border-b bg-background">
      <div className="flex h-[72px] items-center justify-between px-5 sm:h-[84px] sm:px-10 lg:px-12">
        <Link
          href="/"
          aria-label="The Tron Loop home"
          onClick={() => setMenuOpen(false)}
        >
          <BrandLogo />
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-stretch gap-9 self-stretch md:flex"
        >
          <HeaderLink href="/" active={pathname === "/"}>
            This Week
          </HeaderLink>
          <HeaderLink href="/next-week" active={pathname === "/next-week"}>
            Next Week
          </HeaderLink>
          <FutureNavItem>Regular Activities</FutureNavItem>
          <FutureNavItem>About</FutureNavItem>
        </nav>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-md text-primary hover:bg-secondary md:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-full grid border-b bg-background px-5 py-3 shadow-md md:hidden"
        >
          <MobileLink
            href="/"
            active={pathname === "/"}
            onClick={() => setMenuOpen(false)}
          >
            This week
          </MobileLink>
          <MobileLink
            href="/next-week"
            active={pathname === "/next-week"}
            onClick={() => setMenuOpen(false)}
          >
            Next week
          </MobileLink>
        </nav>
      )}
    </header>
  );
}

function HeaderLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--gold)] after:transition-transform",
        active
          ? "text-primary after:scale-x-100"
          : "text-foreground after:scale-x-0 hover:text-primary hover:after:scale-x-100",
      )}
    >
      {children}
    </Link>
  );
}

function FutureNavItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex cursor-default items-center text-sm text-muted-foreground">
      {children}
    </span>
  );
}

function MobileLink({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-3 text-sm font-medium",
        active ? "bg-secondary text-primary" : "hover:bg-secondary",
      )}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

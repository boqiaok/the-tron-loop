import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-[18px] py-[26px] text-sm text-meta md:flex-row md:items-center md:justify-between md:px-8">
        <p>© 2026 The Tron Loop · Hamilton, New Zealand</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-1.5">
          <FooterLink href="/">Plan</FooterLink>
          <span aria-hidden="true">·</span>
          <FooterLink href="/whats-on">What’s on</FooterLink>
          <span aria-hidden="true">·</span>
          <FooterLink href="/about">About</FooterLink>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-meta hover:text-foreground">
      {children}
    </Link>
  );
}

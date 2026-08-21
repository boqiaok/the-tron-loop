import { CalendarRange, ExternalLink } from "lucide-react";
import Link from "next/link";

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
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <CalendarRange className="size-5" />
            </span>
            <span>
              <span className="block text-base leading-tight">
                The Tron Loop
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                Activity administration
              </span>
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--link)] hover:underline"
          >
            View public site
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </header>

      {children}
    </div>
  );
}

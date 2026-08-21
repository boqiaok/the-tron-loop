import type { Metadata } from "next";
import { ArrowRight, CalendarClock, ExternalLink, ListFilter } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how The Tron Loop makes Hamilton activities easier to discover.",
};

const steps = [
  {
    icon: CalendarClock,
    title: "Collected by week",
    description:
      "Activities are grouped into clear Monday-to-Sunday guides, so you can focus on what is happening now.",
  },
  {
    icon: ListFilter,
    title: "Made easy to browse",
    description:
      "Search, categories and chronological ordering help you find a suitable activity without opening dozens of pages.",
  },
  {
    icon: ExternalLink,
    title: "Linked to the source",
    description:
      "Listings point back to the original organiser or source, where you can confirm the latest details before attending.",
  },
];

export default function AboutPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-primary px-5 py-16 text-primary-foreground sm:px-10 sm:py-20 lg:px-12 xl:px-[6.875rem] xl:py-24">
        <div className="absolute -top-24 -right-24 size-80 rounded-full border border-[#4d8fa7]/35" />
        <div className="absolute -top-7 -right-7 size-52 rounded-full border border-[var(--gold)]/30" />
        <div className="relative max-w-4xl">
          <p className="text-xs font-bold tracking-[0.14em] text-[#b8d6de] uppercase">
            About The Tron Loop
          </p>
          <h1 className="mt-5 max-w-3xl font-heading text-5xl leading-[1.04] text-white sm:text-6xl">
            A simpler way to find what’s happening in Hamilton.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            The Tron Loop brings local activities into one practical weekly
            guide, helping people discover more of their city without the usual
            searching and tab-hopping.
          </p>
        </div>
      </section>

      <section className="grid gap-10 bg-background px-5 py-14 sm:px-10 sm:py-18 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 xl:px-[6.875rem] xl:py-20">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-[var(--link)] uppercase">
            Why it exists
          </p>
          <h2 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl">
            Local information, without the noise
          </h2>
        </div>
        <div className="space-y-5 text-base leading-7 text-muted-foreground">
          <p>
            Hamilton has markets, workshops, performances, family activities
            and community events happening every week. The information is
            often spread across organiser websites, social pages and community
            notices.
          </p>
          <p>
            The Tron Loop does not replace those organisers. It provides a
            consistent starting point: a weekly overview that is quick to scan
            on desktop or mobile, with direct links to original sources.
          </p>
        </div>
      </section>

      <section className="bg-secondary px-5 py-14 sm:px-10 sm:py-18 lg:px-12 xl:px-[6.875rem] xl:py-20">
        <p className="text-xs font-bold tracking-[0.12em] text-[var(--link)] uppercase">
          How it works
        </p>
        <h2 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl">
          From scattered listings to one weekly guide
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="rounded-xl border border-primary/10 bg-white p-6"
              >
                <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-heading text-2xl text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 bg-white px-5 py-12 sm:px-10 md:grid-cols-[1fr_auto] md:items-center lg:px-12 xl:px-[6.875rem]">
        <div>
          <h2 className="font-heading text-3xl text-foreground">
            Start with this week
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Times, prices and availability can change. Always confirm the final
            information with the original organiser before attending.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/this-week"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Explore this week
            <ArrowRight />
          </Link>
          <Link
            href="/next-week"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            View next week
          </Link>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how The Tron Loop makes Hamilton activities easier to discover.",
};

const steps = [
  {
    title: "Collected every week",
    description:
      "Listings come from council, library and community sources and are grouped into Monday-to-Sunday weeks, so you can focus on what is happening now.",
  },
  {
    title: "Quick to scan",
    description:
      "Every activity is one compact row with its time, category, place and cost. Filters and search narrow the week without opening dozens of pages.",
  },
  {
    title: "Linked to the source",
    description:
      "Each listing points back to the original organiser, where you can confirm the latest details before you go.",
  },
];

export default function AboutPage() {
  return (
    <main>
      <section className="border-b bg-card">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5 px-[18px] py-10 md:px-8 md:py-16">
          <span className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            About The Tron Loop
          </span>
          <h1 className="max-w-[720px] text-[32px] leading-[1.06] tracking-[-0.035em] md:text-[52px] md:leading-[1.02]">
            A simpler way to find what’s on{" "}
            <span className="font-serif font-normal italic tracking-normal">
              in Hamilton
            </span>
          </h1>
          <p className="max-w-[640px] text-base leading-[1.6] text-body md:text-[17px]">
            The Tron Loop brings local activities into one practical weekly
            guide, helping people discover more of their city without the usual
            searching and tab-hopping.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-6 px-[18px] py-10 md:grid-cols-[0.8fr_1.2fr] md:gap-12 md:px-8 md:py-14">
        <h2 className="text-2xl md:text-[28px]">
          Local information, without the noise
        </h2>
        <div className="flex flex-col gap-4 text-base leading-[1.6] text-body">
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

      <section className="mx-auto flex max-w-[1120px] flex-col gap-5 px-[18px] pb-10 md:px-8 md:pb-14">
        <h2 className="text-2xl md:text-[28px]">How it works</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-2 rounded-[16px] border bg-card p-[22px]"
            >
              <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Step {index + 1}
              </span>
              <h3 className="text-xl">{step.title}</h3>
              <p className="text-sm leading-[1.55] text-body">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-[1120px] px-[18px] pb-12 md:px-8 md:pb-16">
        <div className="flex flex-col gap-5 rounded-[16px] bg-primary p-[22px] text-primary-foreground md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl md:text-2xl">Start with this week</h2>
            <p className="max-w-[560px] text-sm leading-[1.55] text-[#B8BBC1]">
              Times, prices and availability can change. Always confirm the
              final information with the original organiser before attending.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/"
              className="rounded-full bg-white px-5 py-3 text-[15px] font-semibold text-primary hover:text-primary hover:no-underline"
            >
              Plan my day
            </Link>
            <Link
              href="/whats-on"
              className="rounded-full border border-white/40 px-5 py-3 text-[15px] font-semibold text-white hover:bg-white/10 hover:text-white hover:no-underline"
            >
              See what’s on
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

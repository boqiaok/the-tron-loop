import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "whatson is an independent weekly guide to what’s on in Hamilton, built by University of Waikato student Asher Jin.",
  alternates: { canonical: "/about" },
};

const contactEmail = "hello@whson.com";

export default function AboutPage() {
  return (
    <main>
      <article className="mx-auto flex max-w-[680px] flex-col items-center px-[18px] py-12 md:px-8 md:py-20">
        <span className="text-sm font-semibold tracking-[0.12em] text-muted-foreground">
          Kia ora,
        </span>
        <h1 className="mt-3 text-center text-[32px] leading-[1.06] tracking-[-0.035em] md:text-[48px] md:leading-[1.02]">
          A little about{" "}
          <span className="font-serif font-normal italic tracking-normal">
            whatson
          </span>
        </h1>
        <hr className="mt-7 w-12 border-t-2 border-foreground/40" />

        <div className="mt-8 flex flex-col gap-5 text-base leading-[1.7] text-body md:text-[17px]">
          <p>
            I’m Asher, a student at the University of Waikato. I started
            whatson in August 2026 because I kept running into the same
            problem: I knew there were good things happening in Hamilton, but I
            only ever found out about them after they’d finished.
          </p>
          <p>
            The details were out there — scattered across council pages,
            library calendars, event sites and Facebook posts. Planning a
            Saturday meant opening a dozen tabs. So I built the page I wished
            existed: one place to see what’s on in the Tron this week, easy to
            scan on your phone.
          </p>
          <p>
            whatson brings listings from sources like Eventfinda and Hamilton
            Libraries into one weekly view, organised Monday to Sunday. You can
            browse day by day, or describe what you’re looking for —
            “something free with the kids on Sunday morning” — and get an
            AI-assisted plan to help you decide.
          </p>
          <p>
            This is an independent, one-person project. It isn’t affiliated
            with the council or the organisers featured here. Every listing
            links back to its original source, so please check the latest
            details there before heading out.
          </p>
          <p>
            I’m still building and improving whatson. Know something good
            happening in Hamilton? Found a broken link, or have an idea for the
            site? Send me a note — I’d love to hear it.
          </p>
        </div>

        <a
          href={`mailto:${contactEmail}`}
          className="mt-8 rounded-full bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground hover:text-primary-foreground hover:no-underline"
        >
          Get in touch →
        </a>

        <p className="mt-10 self-start text-base leading-[1.5]">
          — <span className="font-semibold">Asher Jin</span>
          <br />
          <span className="font-serif text-muted-foreground italic">
            University of Waikato
          </span>
        </p>
      </article>

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

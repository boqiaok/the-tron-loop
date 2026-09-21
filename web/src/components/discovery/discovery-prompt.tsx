"use client";

import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

const EXAMPLES = [
  "Free family activities this Saturday afternoon",
  "Something creative indoors in Hamilton Central",
  "Dance and coffee this Sunday afternoon",
];

export function DiscoveryPrompt() {
  const router = useRouter();
  const [text, setText] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    sessionStorage.removeItem("tron-discovery-state");
    sessionStorage.setItem("tron-discovery-request", value);
    router.push("/discover");
  }

  return (
    <div className="mt-8 max-w-2xl rounded-2xl border border-white/15 bg-white/10 p-4 shadow-xl backdrop-blur-sm sm:p-5">
      <form onSubmit={submit}>
        <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[0.14em] text-[#b8d6de] uppercase">
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI day planner
        </div>
        <label
          htmlFor="discovery-request"
          className="mt-2 block font-heading text-xl text-white sm:text-2xl"
        >
          Tell us how you want to spend your day
        </label>
        <p
          id="discovery-request-help"
          className="mt-1.5 max-w-xl text-sm leading-6 text-white/70"
        >
          Describe your time, interests, budget or neighbourhood in your own
          words. AI will find matching Hamilton activities and shape them into
          a practical plan.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex min-h-12 flex-1 items-center gap-2 rounded-lg bg-white px-3 text-foreground ring-1 ring-black/5">
            <CalendarDays
              className="size-4 shrink-0 text-[var(--link)]"
              aria-hidden="true"
            />
            <input
              id="discovery-request"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={500}
              aria-describedby="discovery-request-help"
              placeholder="e.g. Free family activities this Saturday afternoon…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="bg-[var(--gold)] text-foreground hover:bg-[#d7b875]"
          >
            Plan my day <ArrowRight />
          </Button>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/75">
        <span className="font-semibold text-white/85">Try a day like:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setText(example)}
            className="rounded-full border border-white/25 px-3 py-1.5 hover:bg-white/10"
          >
            {example}
          </button>
        ))}
        <button
          type="button"
          onClick={() => router.push("/discover")}
          className="font-semibold underline underline-offset-2"
        >
          Choose filters instead
        </button>
      </div>
    </div>
  );
}

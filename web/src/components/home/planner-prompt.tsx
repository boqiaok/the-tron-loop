"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { startPlan } from "@/lib/discovery/plan-request";

const EXAMPLES = [
  { label: "Free things tonight", shortLabel: "Free tonight", text: "Free things to do tonight" },
  {
    label: "Rainy Sunday with a toddler",
    shortLabel: "Rainy Sunday",
    text: "Something indoors on Sunday with a toddler",
  },
  {
    label: "Live music near the river",
    shortLabel: "Live music",
    text: "Live music near the river this weekend",
  },
];

/** The natural-language planner: the page’s hero and its primary action. */
export function PlannerPrompt() {
  const router = useRouter();
  const [text, setText] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    startPlan(value);
    router.push("/plan");
  }

  return (
    <div className="flex w-full max-w-[760px] flex-col gap-3.5">
      <form
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-[14px] border border-primary bg-card p-3.5 shadow-[0_10px_30px_rgba(20,22,26,0.07)] md:gap-3.5 md:rounded-[16px] md:px-[18px] md:pt-[18px] md:pb-3.5"
      >
        <label htmlFor="plan-request" className="sr-only">
          Describe your day
        </label>
        <textarea
          id="plan-request"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          maxLength={500}
          placeholder="Saturday from 12 to 5 with the kids. Something indoors, preferably free, and we like crafts and science."
          className="field-sizing-content min-h-[2lh] w-full resize-none bg-transparent text-[15px] leading-[1.45] text-foreground outline-none placeholder:text-muted-foreground md:text-[17px]"
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="hidden flex-wrap gap-2 md:flex">
            {EXAMPLES.map((example) => (
              <ExampleChip key={example.label} onClick={() => setText(example.text)}>
                {example.label}
              </ExampleChip>
            ))}
          </div>
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-full bg-action px-[22px] py-3 text-[15px] font-semibold whitespace-nowrap text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60 md:py-[11px]"
          >
            Plan my day
          </button>
        </div>
      </form>
      <div className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] [scrollbar-width:none] md:hidden">
        {EXAMPLES.map((example) => (
          <ExampleChip key={example.label} onClick={() => setText(example.text)}>
            {example.shortLabel}
          </ExampleChip>
        ))}
      </div>
    </div>
  );
}

function ExampleChip({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-line px-3 py-[5px] text-[13px] whitespace-nowrap text-body hover:border-[#CFCCC4] hover:text-foreground"
    >
      {children}
    </button>
  );
}

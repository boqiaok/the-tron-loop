import { Waves } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandLogo({
  inverse = false,
  tagline = false,
}: {
  inverse?: boolean;
  tagline?: boolean;
}) {
  return (
    <span className="flex items-center gap-3">
      <Waves
        aria-hidden="true"
        className={cn(
          "size-9 shrink-0 stroke-[1.8]",
          inverse ? "text-primary-foreground" : "text-primary",
        )}
      />
      <span className="grid gap-0.5">
        <span
          className={cn(
            "font-heading text-xl leading-none tracking-wide sm:text-2xl",
            inverse ? "text-primary-foreground" : "text-primary",
          )}
        >
          THE TRON LOOP
        </span>
        {tagline && (
          <span className="text-[0.65rem] text-[var(--gold)]">
            Your week in Hamilton.
          </span>
        )}
      </span>
    </span>
  );
}

import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cn("flex shrink-0 items-center", compact ? "gap-2" : "gap-2.5")}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block bg-primary",
          compact ? "size-[22px] rounded-[7px]" : "size-[26px] rounded-[8px]",
        )}
      />
      <span
        className={cn(
          "font-semibold tracking-[-0.02em] text-foreground",
          compact ? "text-base" : "text-lg",
        )}
      >
        The Tron Loop
      </span>
    </span>
  );
}

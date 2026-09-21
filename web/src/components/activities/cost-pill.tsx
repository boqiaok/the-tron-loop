import type { CostLabel } from "@/lib/activities/format";
import { cn } from "@/lib/utils";

export function CostPill({ cost }: { cost: CostLabel }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        cost.free
          ? "bg-free text-free-foreground"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {cost.label}
    </span>
  );
}

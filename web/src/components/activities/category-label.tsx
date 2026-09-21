import { getCategory } from "@/lib/activities/category";
import { cn } from "@/lib/utils";
import type { ActivityCategory } from "@/types/activity";

/** A category is always a coloured dot plus its word — never colour alone. */
export function CategoryLabel({
  category,
  short = false,
  className,
}: {
  category: ActivityCategory;
  short?: boolean;
  className?: string;
}) {
  const info = getCategory(category);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-[5px] md:gap-1.5",
        className,
      )}
    >
      <CategoryDot color={info.color} />
      {short ? info.shortLabel : info.label}
    </span>
  );
}

export function CategoryDot({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full md:size-[7px]", className)}
      style={{ backgroundColor: color }}
    />
  );
}

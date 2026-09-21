import { ActivityRow } from "@/components/activities/activity-row";
import type { OccurrenceGroup } from "@/lib/activities/occurrences";

/** Day-grouped rows; each row links to the activity’s detail page. */
export function OccurrenceList({
  groups,
  recurring = false,
}: {
  groups: OccurrenceGroup[];
  recurring?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 md:gap-1.5">
      {groups.map((group, index) => (
        <section
          key={group.key}
          aria-labelledby={`day-${group.key}`}
          className="flex flex-col gap-2 md:gap-1.5"
        >
          <h3
            id={`day-${group.key}`}
            className={
              index === 0
                ? "flex items-baseline gap-2 px-0.5 pb-1 md:gap-2.5 md:pt-2"
                : "flex items-baseline gap-2 px-0.5 pt-1.5 pb-1 md:gap-2.5 md:pt-3.5"
            }
          >
            <span className="text-xs font-bold tracking-[0.08em] uppercase md:text-[13px]">
              {group.label}
            </span>
            <span className="text-xs font-normal tracking-normal text-muted-foreground md:text-[13px]">
              <span className="md:hidden">{group.occurrences.length}</span>
              <span className="hidden md:inline">
                {group.occurrences.length}{" "}
                {group.occurrences.length === 1 ? "activity" : "activities"}
              </span>
            </span>
          </h3>
          {group.occurrences.map((occurrence) => (
            <ActivityRow
              key={`${occurrence.date.id}-${group.key}`}
              occurrence={occurrence}
              recurring={recurring}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

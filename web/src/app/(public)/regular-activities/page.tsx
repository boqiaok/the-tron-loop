import { ActivityCard } from "@/components/activities/activity-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getRegularActivities } from "@/lib/api/activities";
import { ACTIVITY_TIME_ZONE } from "@/lib/dates/week-range";

export const dynamic = "force-dynamic";

export default async function RegularActivitiesPage() {
  const activities = await getRegularActivities();

  return (
    <main>
      <section className="border-b px-5 py-8 sm:px-10 sm:py-10 lg:px-12">
        <p className="text-xs font-bold tracking-[0.14em] text-[var(--gold)] uppercase">Hamilton favourites</p>
        <h1 className="mt-2 font-heading text-5xl leading-none text-primary sm:text-6xl">Regular activities</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
          Workshops, meetups and community activities that repeat weekly or fortnightly.
        </p>
      </section>
      <section className="px-5 py-5 sm:px-10 lg:px-12">
        {activities.length ? (
          <div className="grid gap-3">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                scheduleLabels={activity.dates.map(formatRecurrence)}
              />
            ))}
          </div>
        ) : (
          <Alert className="py-6">
            <AlertTitle>No regular activities yet</AlertTitle>
            <AlertDescription>Regular activities will appear here after they are published.</AlertDescription>
          </Alert>
        )}
      </section>
    </main>
  );
}

const DAY_NAMES: Record<string, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
};

function formatRecurrence(date: {
  startsAt: string;
  isAllDay: boolean;
  recurrenceRule: string | null;
}): string {
  const fields = new Map(
    (date.recurrenceRule ?? "")
      .split(";")
      .map((part) => part.split("=", 2) as [string, string]),
  );
  const days = (fields.get("BYDAY") ?? "")
    .split(",")
    .map((day) => DAY_NAMES[day])
    .filter(Boolean);
  const dayLabel = formatList(days) || new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    timeZone: ACTIVITY_TIME_ZONE,
  }).format(new Date(date.startsAt));
  const interval = fields.get("INTERVAL") === "2" ? "Every two weeks" : "Every week";
  const time = date.isAllDay
    ? "all day"
    : new Intl.DateTimeFormat("en-NZ", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: ACTIVITY_TIME_ZONE,
      }).format(new Date(date.startsAt));
  const until = fields.get("UNTIL");
  const untilLabel = until
    ? ` · until ${new Intl.DateTimeFormat("en-NZ", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: ACTIVITY_TIME_ZONE,
      }).format(new Date(`${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}T12:00:00Z`))}`
    : "";
  const exceptions = fields.get("EXDATE")?.split(",").length ?? 0;
  return `${interval} on ${dayLabel} · ${time}${untilLabel}${exceptions ? ` · ${exceptions} excluded ${exceptions === 1 ? "date" : "dates"}` : ""}`;
}

function formatList(values: string[]): string {
  return new Intl.ListFormat("en-NZ", { style: "long", type: "conjunction" }).format(values);
}

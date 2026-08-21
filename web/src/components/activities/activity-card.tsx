import { Ban, CalendarDays, ExternalLink, MapPin, Ticket } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatActivityDate } from "@/lib/dates/week-range";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types/activity";

export function ActivityCard({ activity }: { activity: Activity }) {
  const isCancelled = activity.status === "cancelled";
  const primaryTag = activity.tags[0];
  const imageStyle = getActivityImageStyle(activity);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        activity.imageUrl && "md:grid md:min-h-[154px] md:grid-cols-[32%_1fr]",
        isCancelled &&
          "border-2 border-slate-400 border-l-[6px] bg-slate-200/90 shadow-inner",
      )}
    >
      {isCancelled ? (
        <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 text-xs font-bold tracking-[0.12em] text-white uppercase md:col-span-2 sm:px-5">
          <Ban className="size-4" />
          Cancelled activity
        </div>
      ) : null}

      {activity.imageUrl && (
        <div
          role="img"
          aria-label={`${activity.title} activity image`}
          className={cn(
            "h-[132px] bg-secondary bg-cover bg-center md:h-full",
            isCancelled && "grayscale opacity-35",
          )}
          style={imageStyle}
        />
      )}

      <div className="flex min-w-0 flex-col px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <h3
            className={cn(
              "min-w-0 font-heading text-2xl leading-tight text-primary",
              isCancelled &&
                "text-slate-500 line-through decoration-2 decoration-slate-500",
            )}
          >
            {activity.title}
          </h3>
          <div className="flex shrink-0 gap-1.5">
            {primaryTag && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[0.68rem] text-primary",
                  primaryTag.slug === "family" &&
                    "bg-[color-mix(in_srgb,var(--gold)_28%,white)]",
                  isCancelled && "grayscale opacity-60",
                )}
              >
                {primaryTag.name}
              </Badge>
            )}
          </div>
        </div>

        <div
          className={cn(
            "mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.72rem] text-muted-foreground",
            isCancelled && "opacity-45 grayscale",
          )}
        >
          <div className="flex items-start gap-1.5">
            <CalendarDays className="mt-px size-3.5 shrink-0 text-primary" />
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {activity.dates.map((date) => (
                <li key={date.id}>
                  {formatActivityDate(
                    date.startsAt,
                    date.endsAt,
                    date.isAllDay,
                  )}
                </li>
              ))}
            </ul>
          </div>

          {activity.venue && (
            <span className="inline-flex items-start gap-1.5">
              <MapPin className="mt-px size-3.5 shrink-0 text-primary" />
              {formatVenue(activity)}
            </span>
          )}

          <span className="inline-flex items-start gap-1.5">
            <Ticket className="mt-px size-3.5 shrink-0 text-primary" />
            {formatCost(activity)}
            {activity.costDetails && ` · ${activity.costDetails}`}
          </span>
        </div>

        <p
          className={cn(
            "mt-2 line-clamp-2 max-w-4xl text-xs leading-5 text-muted-foreground sm:text-[0.8rem]",
            isCancelled && "opacity-45",
          )}
        >
          {activity.summary ?? activity.description}
        </p>

        {activity.sourceUrl && (
          <Link
            href={activity.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mt-2 inline-flex self-end text-xs font-semibold text-[var(--link)] hover:underline",
              isCancelled && "text-slate-500",
            )}
          >
            View original source
            <ExternalLink className="ml-1 size-3" />
          </Link>
        )}
      </div>
    </article>
  );
}

function getActivityImageStyle(activity: Activity): React.CSSProperties {
  const imageUrl = activity.imageUrl;

  if (!imageUrl) return {};

  if (imageUrl !== "/images/activities/event-triptych.png") {
    return { backgroundImage: `url(${JSON.stringify(imageUrl)})` };
  }

  const positionBySlug: Record<string, string> = {
    "dev-community-repair-cafe": "left center",
    "dev-friday-live-music-session": "center center",
    "dev-after-school-art-lab": "right center",
  };

  return {
    backgroundImage: `url(${JSON.stringify(imageUrl)})`,
    backgroundPosition: positionBySlug[activity.slug] ?? "center center",
    backgroundSize: "300% auto",
  };
}

function formatVenue(activity: Activity): string {
  const venue = activity.venue;

  if (!venue) return "";

  return [venue.name, venue.suburb].filter(Boolean).join(", ");
}

function formatCost(activity: Activity): string {
  if (activity.costType === "free") return "Free";
  if (activity.costType === "unknown") return "Price not listed";
  if (activity.costAmountFrom === null) return "Paid event";

  const amount = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: activity.currency,
  }).format(activity.costAmountFrom);

  return `From ${amount}`;
}

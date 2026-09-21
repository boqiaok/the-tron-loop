"use client";

import { useEffect, useRef, useState } from "react";

import { getCategory } from "@/lib/activities/category";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types/activity";

const CANCELLED_TINT = "#8A8E95";

/**
 * 58px (desktop) / 50px (mobile) wide, stretched to the row's height so it
 * fills the row rather than floating in it; the min height keeps short rows
 * from collapsing it. Without a photo
 * it falls back to a 10% tint of the category colour, so rows never change
 * height.
 */
export function ActivityThumb({
  activity,
  className,
}: {
  activity: Pick<Activity, "imageUrl" | "category" | "status">;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);

  // A server-rendered image can fail before hydration attaches onError.
  useEffect(() => {
    const element = image.current;
    if (element?.complete && element.naturalWidth === 0) setFailed(true);
  }, []);
  const color =
    activity.status === "cancelled"
      ? CANCELLED_TINT
      : getCategory(activity.category).color;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid min-h-[50px] w-[50px] shrink-0 place-items-center self-stretch overflow-hidden rounded-[7px] border border-line md:min-h-14 md:w-[58px] md:rounded-[8px]",
        activity.status === "cancelled" && "grayscale",
        className,
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      {activity.imageUrl && !failed ? (
        // Listing photos come from many organiser hosts, so next/image's
        // allow-list does not fit; the thumbnail is small and lazy-loaded.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={image}
          src={activity.imageUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <span
          className="h-[9px] w-3 rounded-[3px] opacity-35 md:h-2.5 md:w-3.5"
          style={{ backgroundColor: color }}
        />
      )}
    </span>
  );
}

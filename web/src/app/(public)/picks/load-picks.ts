import type { Metadata } from "next";

import { getWeeklyGuide } from "@/lib/api/weekly-guides";
import { getWeekRange, getWeekSlug, type WeekRange } from "@/lib/dates/week-range";

/** A week's published picks, and whether the week before has any. */
export async function loadPicks(range: WeekRange) {
  const slug = getWeekSlug(range);
  const previousSlug = getWeekSlug(getWeekRange(-1, new Date(range.from)));
  const [guide, previous] = await Promise.all([
    getWeeklyGuide(slug),
    getWeeklyGuide(previousSlug),
  ]);
  return {
    slug,
    guide: guide?.items.length ? guide : null,
    previousWeek: previous?.items.length ? previousSlug : null,
  };
}

export function picksMetadata(
  title: string,
  canonical: string,
  coverWeek: string | null,
): Metadata {
  const description =
    "The editor’s short list of things worth going to in Hamilton this week.";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      images: coverWeek
        ? [{ url: `/picks/${coverWeek}/cover.png`, width: 1080, height: 1440 }]
        : undefined,
    },
  };
}

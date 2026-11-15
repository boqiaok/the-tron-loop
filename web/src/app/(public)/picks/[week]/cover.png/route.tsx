import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import {
  COVER_HEIGHT,
  COVER_WIDTH,
  PicksCover,
} from "@/components/picks/picks-cover";
import { formatShortRange } from "@/lib/activities/format";
import { getWeeklyGuide } from "@/lib/api/weekly-guides";
import { getWeekRangeFromDate } from "@/lib/dates/week-range";
import { toCoverRows } from "@/lib/picks/cover-rows";

export const dynamic = "force-dynamic";

const FONT_DIR = join(process.cwd(), "src/assets/fonts");

/**
 * The share cover for a week's published picks, 1080×1440 for social posts.
 * `?download=1` saves it as a file instead of showing it.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ week: string }> },
) {
  const { week } = await params;
  const range = getWeekRangeFromDate(week);
  const guide = range ? await getWeeklyGuide(week) : null;
  const { rows, more } = guide ? toCoverRows(guide) : { rows: [], more: 0 };
  if (!range || !rows.length) {
    return new Response("No picks are published for this week.", { status: 404 });
  }

  const [regular, semiBold, italic] = await Promise.all([
    readFile(join(FONT_DIR, "Outfit-Regular.ttf")),
    readFile(join(FONT_DIR, "Outfit-SemiBold.ttf")),
    readFile(join(FONT_DIR, "Newsreader-Italic.ttf")),
  ]);
  const download = new URL(request.url).searchParams.get("download") === "1";

  return new ImageResponse(
    <PicksCover rangeLabel={formatShortRange(range)} rows={rows} more={more} />,
    {
      width: COVER_WIDTH,
      height: COVER_HEIGHT,
      fonts: [
        { name: "Outfit", data: regular, weight: 400, style: "normal" },
        { name: "Outfit", data: semiBold, weight: 600, style: "normal" },
        { name: "Newsreader", data: italic, weight: 400, style: "italic" },
      ],
      headers: {
        "Cache-Control": "no-store",
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="whatson-picks-${week}.png"`,
            }
          : {}),
      },
    },
  );
}

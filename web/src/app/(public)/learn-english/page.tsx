import type { Metadata } from "next";
import Link from "next/link";

import { OccurrenceList } from "@/components/activities/occurrence-list";
import { groupByWeekday } from "@/lib/activities/occurrences";
import { getRegularActivities } from "@/lib/api/activities";

export const dynamic = "force-dynamic";

const ENGLISH_TOPIC = "english";

export const metadata: Metadata = {
  title: "Learn English in Hamilton: conversation groups and classes",
  description:
    "Weekly English conversation groups, classes and speaking clubs around Hamilton, with days, times, venues and costs in one place.",
  alternates: { canonical: "/learn-english" },
};

export default async function LearnEnglishPage() {
  const activities = (await getRegularActivities()).filter((activity) =>
    activity.tags.some((tag) => tag.slug === ENGLISH_TOPIC),
  );
  const groups = groupByWeekday(activities);

  return (
    <main>
      <section className="border-b bg-card">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-[18px] py-10 md:px-8 md:py-14">
          <span className="text-sm font-semibold tracking-[0.12em] text-muted-foreground">
            Conversation groups and classes
          </span>
          <h1 className="text-[32px] leading-[1.06] tracking-[-0.035em] md:text-[48px] md:leading-[1.02]">
            Learn English in Hamilton
          </h1>
          <div className="flex max-w-[680px] flex-col gap-4 text-base leading-[1.7] text-body md:text-[17px]">
            <p>
              Talking with real people is one of the best ways to build
              confidence in English. Around Hamilton, local libraries,
              community groups and churches run weekly conversation groups,
              classes and speaking clubs where you can practise in a friendly
              setting.
            </p>
            <p>
              {activities.length === 1
                ? "whatson lists one of them below,"
                : `whatson lists ${activities.length} of them below,`}{" "}
              grouped by the day they meet. Open a listing to see its cost,
              level and who it is for. Times can change, so check with the
              organiser before you go.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-[18px] pt-6 pb-12 md:px-8 md:pb-16">
        <h2 className="sr-only">Weekly English groups</h2>
        {groups.length ? (
          <OccurrenceList groups={groups} recurring />
        ) : (
          <p className="text-[15px] text-secondary-foreground">
            There are no English groups listed right now.
          </p>
        )}
        <p className="text-[15px] text-secondary-foreground">
          Know a group that is missing?{" "}
          <Link href="/about" className="font-medium text-action">
            Let me know
          </Link>
          , or browse{" "}
          <Link href="/whats-on?scope=regular" className="font-medium text-action">
            all regular activities
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

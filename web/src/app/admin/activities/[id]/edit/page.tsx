import { notFound } from "next/navigation";

import { ActivityForm } from "@/components/admin/activity-form";
import {
  ApiError,
  getAdminActivity,
  getAdminTags,
  getAdminVenues,
} from "@/lib/api/admin-activities";

export const dynamic = "force-dynamic";

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let activity;

  try {
    activity = await getAdminActivity(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [tags, venues] = await Promise.all([
    getAdminTags(),
    getAdminVenues(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <div className="mb-7">
        <p className="text-xs font-bold tracking-[0.14em] text-[var(--gold)] uppercase">
          Activities
        </p>
        <h1 className="mt-1 font-heading text-4xl text-primary">
          {activity.status === "cancelled" ? "View activity" : "Edit activity"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {activity.title}
        </p>
      </div>
      <ActivityForm activity={activity} tags={tags} venues={venues} />
    </main>
  );
}

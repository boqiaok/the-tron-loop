import { ActivityForm } from "@/components/admin/activity-form";
import { getAdminTags, getAdminVenues } from "@/lib/api/admin-activities";

export const dynamic = "force-dynamic";

export default async function NewActivityPage() {
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
          New activity
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          New activities are saved as drafts and stay off the public site until
          published.
        </p>
      </div>
      <ActivityForm tags={tags} venues={venues} />
    </main>
  );
}

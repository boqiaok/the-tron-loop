import { ReviewDesk } from "@/components/admin/review-desk";
import { SourceChanges } from "@/components/admin/source-changes";
import { getAdminActivityReview } from "@/lib/api/admin-activity-review";
import { getAdminSourceChanges } from "@/lib/api/admin-source-changes";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  const { context } = await requireAdminSession();
  const [data, sourceChanges] = await Promise.all([
    getAdminActivityReview(context),
    getAdminSourceChanges(context),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <p className="text-xs font-bold tracking-[0.14em] text-[var(--gold)] uppercase">
        Administration
      </p>
      <h1 className="mt-1 font-heading text-4xl text-primary">Review drafts</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every draft is sorted for a family and community guide. Publish the
        ready ones in one go, read the ones worth a look, and leave the rest as
        drafts. Each label says why an activity landed where it did.
      </p>

      <SourceChanges items={sourceChanges} />
      <ReviewDesk data={data} />
    </main>
  );
}

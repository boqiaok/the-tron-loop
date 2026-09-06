import { SourceManager } from "@/components/admin/source-manager";
import { getAdminImportRuns, getAdminSources } from "@/lib/api/admin-activities";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const { context } = await requireAdminSession();
  const [sources, runs] = await Promise.all([
    getAdminSources(context),
    getAdminImportRuns(context),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <p className="text-xs font-bold tracking-[0.14em] text-[var(--gold)] uppercase">Administration</p>
      <h1 className="mt-1 font-heading text-4xl text-primary">Sources & imports</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Connect JSON feeds, import activities as drafts and review run results.
      </p>
      <SourceManager sources={sources} runs={runs} />
    </main>
  );
}

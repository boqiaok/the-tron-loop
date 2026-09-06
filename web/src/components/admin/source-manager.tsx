"use client";

import { AlertCircle, LoaderCircle, Play, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createAdminSource,
  runAdminImport,
  type ActivitySource,
  type ImportRun,
} from "@/lib/api/admin-activities";

const inputClassName =
  "min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/20";

export function SourceManager({
  sources,
  runs,
}: {
  sources: ActivitySource[];
  runs: ImportRun[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setCreating(true);
    setError(null);
    try {
      await createAdminSource({
        name: String(data.get("name")),
        feedUrl: String(data.get("feedUrl")),
        scheduleHours: Number(data.get("scheduleHours")),
      });
      form.reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the source.");
    } finally {
      setCreating(false);
    }
  }

  async function run(sourceId: string) {
    setRunningId(sourceId);
    setError(null);
    try {
      await runAdminImport(sourceId);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not run the import.");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="mt-7 space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-primary">Add JSON feed</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Imported activities are always saved as drafts for review.
        </p>
        <form onSubmit={create} className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr_9rem_auto] lg:items-end">
          <label className="text-sm font-medium">
            Name
            <input name="name" required maxLength={120} className={`${inputClassName} mt-1.5`} />
          </label>
          <label className="text-sm font-medium">
            Feed URL
            <input name="feedUrl" required type="url" placeholder="https://example.com/events.json" className={`${inputClassName} mt-1.5`} />
          </label>
          <label className="text-sm font-medium">
            Every (hours)
            <input name="scheduleHours" required type="number" min={1} max={168} defaultValue={6} className={`${inputClassName} mt-1.5`} />
          </label>
          <Button type="submit" disabled={creating}>
            {creating ? <LoaderCircle className="animate-spin" /> : <Plus />}
            Add source
          </Button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-primary">Sources</h2>
        </div>
        {sources.length ? (
          <div className="divide-y">
            {sources.map((source) => (
              <article key={source.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{source.name}</h3>
                    <Badge variant={source.enabled ? "default" : "secondary"}>
                      {source.enabled ? "Enabled" : "Paused"}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{source.feedUrl}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Every {source.scheduleHours} hours · Last run {source.lastRunAt ? formatDate(source.lastRunAt) : "never"}
                  </p>
                </div>
                <Button variant="outline" onClick={() => void run(source.id)} disabled={runningId !== null}>
                  {runningId === source.id ? <LoaderCircle className="animate-spin" /> : <Play />}
                  {runningId === source.id ? "Importing…" : "Run now"}
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No sources configured.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-primary">Recent imports</h2>
        </div>
        {runs.length ? (
          <div className="divide-y">
            {runs.map((run) => (
              <article key={run.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{run.sourceName}</span>
                    <Badge variant={run.status === "failed" ? "destructive" : "secondary"}>{run.status}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{formatDate(run.startedAt)}</p>
                  {run.error ? <p className="mt-1 text-destructive">{run.error}</p> : null}
                </div>
                <p className="text-muted-foreground">
                  {run.createdCount} created · {run.updatedCount} updated · {run.duplicateCount} duplicates · {run.reviewCount} review · {run.failedCount} failed
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No imports have run.</p>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-[1120px] items-center px-[18px] md:px-8">
      <div className="flex flex-col items-start gap-3 rounded-[16px] border bg-card p-6">
        <h1 className="text-xl">Activities could not be loaded</h1>
        <p className="text-sm text-body">
          Check that the API server is running, then try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary hover:text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main aria-busy="true">
      <section className="border-b px-5 py-8 sm:px-10 sm:py-10 lg:px-12">
        <div className="grid max-w-4xl gap-3">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-12 w-[34rem] max-w-full" />
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        </div>
      </section>
      <section className="grid gap-3 px-5 py-4 sm:px-10 lg:px-12">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-md" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-lg" />
        ))}
      </section>
    </main>
  );
}

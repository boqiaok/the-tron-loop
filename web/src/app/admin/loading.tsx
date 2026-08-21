import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-6 h-14 w-full" />
      <Skeleton className="mt-4 h-96 w-full" />
    </main>
  );
}

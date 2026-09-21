import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex max-w-[1120px] flex-col gap-2 px-[18px] py-6 md:px-8"
    >
      <Skeleton className="h-10 w-full max-w-md rounded-full bg-secondary" />
      <Skeleton className="mt-3 h-4 w-32 bg-secondary" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-[72px] w-full rounded-[12px] bg-card" />
      ))}
    </main>
  );
}

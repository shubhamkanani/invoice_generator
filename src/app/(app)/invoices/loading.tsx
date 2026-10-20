import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-12" aria-busy="true" aria-label="Loading invoices">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-12 w-56" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
        <Skeleton className="h-[5.5rem] rounded-lg" />
        <Skeleton className="h-[5.5rem] rounded-lg" />
      </div>
      <div className="mt-8 space-y-3 rounded-lg border border-border bg-card p-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityStatus } from "@/types/activity";

const LABELS: Record<ActivityStatus, string> = {
  draft: "Draft",
  published: "Published",
  cancelled: "Cancelled",
};

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        status === "draft" && "border-amber-300 bg-amber-50 text-amber-800",
        status === "published" &&
          "border-emerald-300 bg-emerald-50 text-emerald-800",
        status === "cancelled" && "border-slate-300 bg-slate-100 text-slate-600",
      )}
    >
      {LABELS[status]}
    </Badge>
  );
}

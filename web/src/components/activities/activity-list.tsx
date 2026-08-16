import { CalendarX2 } from "lucide-react";

import { ActivityCard } from "@/components/activities/activity-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Activity } from "@/types/activity";

export function ActivityList({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <Alert className="py-6">
        <CalendarX2 />
        <AlertTitle>No activities found</AlertTitle>
        <AlertDescription>
          Try clearing a filter or check the next week.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-3">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

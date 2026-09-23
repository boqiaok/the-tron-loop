export interface PlanningItem {
  id: string;
  scheduleMode: 'fixed' | 'window';
  sourceStart: Date;
  sourceEnd: Date;
  visitMinutes: number | null;
}

export interface PlannedItem<T extends PlanningItem = PlanningItem> {
  item: T;
  start: Date;
  end: Date;
}

export interface PlanConflict {
  code: 'OUTSIDE_WINDOW' | 'OVERLAP' | 'TRAVEL_TIME';
  activityDateIds: string[];
}

export function earliestFit<T extends PlanningItem>(
  item: T,
  notBefore: Date,
  notAfter: Date,
): PlannedItem<T> | null {
  if (item.scheduleMode === 'fixed') {
    return item.sourceStart >= notBefore && item.sourceEnd <= notAfter
      ? { item, start: item.sourceStart, end: item.sourceEnd }
      : null;
  }
  if (!item.visitMinutes) return null;
  const start = new Date(
    Math.max(notBefore.getTime(), item.sourceStart.getTime()),
  );
  // A visit never outlasts the session: a one-hour talk labelled "~90 min"
  // still fits as the whole hour instead of never fitting at all.
  const sessionMinutes =
    (item.sourceEnd.getTime() - item.sourceStart.getTime()) / 60_000;
  const visitMinutes = Math.min(item.visitMinutes, sessionMinutes);
  const end = new Date(start.getTime() + visitMinutes * 60_000);
  const latest = Math.min(notAfter.getTime(), item.sourceEnd.getTime());
  return end.getTime() <= latest ? { item, start, end } : null;
}

export function generatePlan<T extends PlanningItem>(
  items: T[],
  windowStart: Date,
  windowEnd: Date,
  travelMinutes: (from: T, to: T) => number | null,
  bufferMinutes: number,
): PlannedItem<T>[] | null {
  let best: PlannedItem<T>[] | null = null;
  for (const order of permutations(items)) {
    const planned: PlannedItem<T>[] = [];
    for (const item of order) {
      const previous = planned.at(-1);
      const travel = previous ? travelMinutes(previous.item, item) : 0;
      if (travel === null) {
        planned.length = 0;
        break;
      }
      const notBefore = new Date(
        previous
          ? previous.end.getTime() + (travel + bufferMinutes) * 60_000
          : windowStart.getTime(),
      );
      const fit = earliestFit(item, notBefore, windowEnd);
      if (!fit) {
        planned.length = 0;
        break;
      }
      planned.push(fit);
    }
    if (
      planned.length === items.length &&
      (!best || planned[0].start < best[0].start)
    ) {
      best = planned;
    }
  }
  return best;
}

export function validatePlan<T extends PlanningItem>(
  plan: PlannedItem<T>[],
  windowStart: Date,
  windowEnd: Date,
  travelMinutes: (from: T, to: T) => number | null,
  bufferMinutes: number,
): PlanConflict[] {
  const conflicts: PlanConflict[] = [];
  for (const slot of plan) {
    if (slot.start < windowStart || slot.end > windowEnd) {
      conflicts.push({
        code: 'OUTSIDE_WINDOW',
        activityDateIds: [slot.item.id],
      });
    }
  }
  const ordered = [...plan].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous.end > current.start) {
      conflicts.push({
        code: 'OVERLAP',
        activityDateIds: [previous.item.id, current.item.id],
      });
      continue;
    }
    const travel = travelMinutes(previous.item, current.item);
    if (
      travel === null ||
      previous.end.getTime() + (travel + bufferMinutes) * 60_000 >
        current.start.getTime()
    ) {
      conflicts.push({
        code: 'TRAVEL_TIME',
        activityDateIds: [previous.item.id, current.item.id],
      });
    }
  }
  return conflicts;
}

function permutations<T>(values: T[]): T[][] {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, other) => other !== index)).map((rest) => [
      value,
      ...rest,
    ]),
  );
}

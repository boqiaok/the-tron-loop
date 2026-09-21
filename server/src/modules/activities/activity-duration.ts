import { ActivityScheduleMode } from './enums/activity-schedule-mode.enum';
import { DurationSource } from './enums/duration-source.enum';

const WINDOW_DEFAULTS: Array<{ pattern: RegExp; minutes: number }> = [
  { pattern: /\b(?:market|fair|festival)\b/i, minutes: 90 },
  { pattern: /\b(?:exhibition|gallery|museum|art\s+week)\b/i, minutes: 60 },
  { pattern: /\b(?:garden|park|trail)\b/i, minutes: 90 },
];

export function inferActivityScheduling(input: {
  title: string;
  description: string;
  tags: string[];
}): {
  scheduleMode: ActivityScheduleMode;
  visitMinutes: number | null;
  durationSource: DurationSource;
} {
  const text = `${input.title} ${input.description} ${input.tags.join(' ')}`;
  const explicit = parseVisitMinutes(text);
  const configured = WINDOW_DEFAULTS.find(({ pattern }) => pattern.test(text));
  if (!configured) {
    return {
      scheduleMode: ActivityScheduleMode.Fixed,
      visitMinutes: null,
      durationSource: DurationSource.Source,
    };
  }
  return {
    scheduleMode: ActivityScheduleMode.Window,
    visitMinutes: explicit ?? configured.minutes,
    durationSource:
      explicit === null
        ? DurationSource.CategoryDefault
        : DurationSource.Parsed,
  };
}

export function parseVisitMinutes(value: string): number | null {
  const hours =
    /\b(?:about|approx(?:imately)?\.?|around)?\s*(\d+(?:\.\d+)?)\s*[- ]?\s*(?:hours?|hrs?)\b/i.exec(
      value,
    );
  if (hours) return clampMinutes(Math.round(Number(hours[1]) * 60));
  const minutes =
    /\b(?:about|approx(?:imately)?\.?|around)?\s*(\d{2,3})\s*(?:minutes?|mins?)\b/i.exec(
      value,
    );
  return minutes ? clampMinutes(Number(minutes[1])) : null;
}

function clampMinutes(value: number): number | null {
  return Number.isFinite(value) && value >= 15 && value <= 720 ? value : null;
}

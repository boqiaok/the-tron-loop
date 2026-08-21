import { TZDate } from "@date-fns/tz";

export const ACTIVITY_TIME_ZONE = "Pacific/Auckland";

export function toAucklandInputValue(
  iso: string,
  allDay: boolean,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACTIVITY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = `${value.year}-${value.month}-${value.day}`;

  return allDay ? date : `${date}T${value.hour}:${value.minute}`;
}

export function fromAucklandInputValue(value: string): string {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/,
  );

  if (!match) throw new Error("Enter a valid activity date and time.");

  const [, year, month, day, hour = "0", minute = "0"] = match;
  return new TZDate(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    ACTIVITY_TIME_ZONE,
  ).toISOString();
}

export function createDefaultLocalDate(): string {
  const now = TZDate.tz(ACTIVITY_TIME_ZONE);
  now.setDate(now.getDate() + 1);
  now.setHours(9, 0, 0, 0);
  return toAucklandInputValue(now.toISOString(), false);
}

export function addMinutesToLocalDateTime(
  value: string,
  minutes: number,
): string {
  const date = new Date(fromAucklandInputValue(value));
  date.setMinutes(date.getMinutes() + minutes);
  return toAucklandInputValue(date.toISOString(), false);
}

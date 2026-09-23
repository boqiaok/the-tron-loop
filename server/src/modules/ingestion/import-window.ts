import { TZDateMini } from '@date-fns/tz';

export const IMPORT_TIMEZONE = 'Pacific/Auckland';
const IMPORT_WINDOW_DAYS = 21;

export interface ImportWindow {
  startDate: string;
  endDate: string;
  startsAt: string;
  endsAt: string;
}

export function getImportWindow(now = Date.now()): ImportWindow {
  const start = new TZDateMini(now, IMPORT_TIMEZONE);
  start.setHours(0, 0, 0, 0);
  const end = new TZDateMini(start.getTime(), IMPORT_TIMEZONE);
  end.setDate(end.getDate() + IMPORT_WINDOW_DAYS - 1);
  end.setHours(23, 59, 59, 0);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

export function isWithinImportWindow(
  startsAt: string,
  window: ImportWindow,
): boolean {
  return startsAt >= window.startsAt && startsAt <= window.endsAt;
}

function formatDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

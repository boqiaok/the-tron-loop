import { isRecord } from './source-http';
import { SourceType } from './source-type.enum';

/** Facts a source reports about a listing beyond its content. */
export interface SourceSignals {
  /** The account that listed the activity, used to spread picks. */
  organizer: string | null;
  soldOut: boolean;
  /** The lister paid for or was given promotion by the source. */
  featured: boolean;
  performerCount: number;
}

export const NO_SOURCE_SIGNALS: SourceSignals = {
  organizer: null,
  soldOut: false,
  featured: false,
  performerCount: 0,
};

/** Reads signals from the raw payload an adapter received for a listing. */
export function readSourceSignals(
  sourceType: SourceType,
  raw: Record<string, unknown>,
): SourceSignals {
  if (sourceType !== SourceType.Eventfinda) return NO_SOURCE_SIGNALS;

  const artists = isRecord(raw.artists) ? raw.artists.artists : undefined;
  return {
    organizer:
      typeof raw.username === 'string' && raw.username.trim()
        ? raw.username.trim().toLowerCase()
        : null,
    soldOut: raw.is_sold_out === true,
    featured: raw.is_featured === true,
    performerCount: Array.isArray(artists) ? artists.length : 0,
  };
}

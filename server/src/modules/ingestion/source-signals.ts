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
  /** A guide that selects the city's best events lists the activity. */
  curated: boolean;
}

/** Guides that choose which events to list rather than taking every one. */
const CURATED_SOURCE_TYPES = new Set([SourceType.Hlive]);

export const NO_SOURCE_SIGNALS: SourceSignals = {
  organizer: null,
  soldOut: false,
  featured: false,
  performerCount: 0,
  curated: false,
};

/** Reads signals from the raw payload an adapter received for a listing. */
export function readSourceSignals(
  sourceType: SourceType,
  raw: Record<string, unknown>,
): SourceSignals {
  if (CURATED_SOURCE_TYPES.has(sourceType)) {
    return {
      ...NO_SOURCE_SIGNALS,
      soldOut: raw.status === 'sold-out',
      curated: true,
    };
  }
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
    curated: false,
  };
}

/**
 * Combines what each source reports about the same activity: one source
 * listing it as sold out or curated is enough.
 */
export function mergeSourceSignals(signals: SourceSignals[]): SourceSignals {
  return signals.reduce(
    (merged, next) => ({
      organizer: merged.organizer ?? next.organizer,
      soldOut: merged.soldOut || next.soldOut,
      featured: merged.featured || next.featured,
      performerCount: Math.max(merged.performerCount, next.performerCount),
      curated: merged.curated || next.curated,
    }),
    NO_SOURCE_SIGNALS,
  );
}

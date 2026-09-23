/**
 * Decides whether two listings from different sources describe the same
 * activity. Callers only compare listings that share a start time, so the
 * title and venue checks can stay strict without fuzzy scoring.
 */

export interface MatchVenue {
  name: string;
  address: string | null;
}

// Words that sources add or drop freely around the same venue name.
const VENUE_NOISE = new Set([
  'the',
  'at',
  'of',
  'and',
  'hamilton',
  'kirikiriroa',
  'waikato',
  'nz',
  'new',
  'zealand',
]);

export function normalizeTitle(title: string): string {
  return tokens(title.replace(/\s*\(\d+\)\s*$/, '')).join(' ');
}

export function isSameTitle(left: string, right: string): boolean {
  return normalizeTitle(left) === normalizeTitle(right);
}

export function isSameVenue(
  left: MatchVenue | null,
  right: MatchVenue | null,
): boolean {
  // A listing without a venue cannot contradict one that has a venue.
  if (!left || !right) return true;

  const leftStreet = streetLine(left.address);
  const rightStreet = streetLine(right.address);
  if (leftStreet && rightStreet && leftStreet === rightStreet) return true;

  const leftName = venueTokens(left.name);
  const rightName = venueTokens(right.name);
  if (!leftName.size || !rightName.size) return false;
  const [smaller, larger] =
    leftName.size <= rightName.size
      ? [leftName, rightName]
      : [rightName, leftName];
  return [...smaller].every((token) => larger.has(token));
}

function venueTokens(name: string): Set<string> {
  return new Set(tokens(name).filter((token) => !VENUE_NOISE.has(token)));
}

function streetLine(address: string | null): string | null {
  const first = address?.split(',')[0];
  const normalized = first ? tokens(first).join(' ') : '';
  // A bare suburb or city is not specific enough to identify a venue.
  return /\d/.test(normalized) ? normalized : null;
}

function tokens(value: string): string[] {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

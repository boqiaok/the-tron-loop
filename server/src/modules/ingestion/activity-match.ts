/**
 * Decides whether two listings from different sources describe the same
 * activity. Callers only compare listings that share a start time and a
 * compatible venue, so a reworded title only needs to share its key words.
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

// Short or generic words that do not identify an event on their own.
const TITLE_NOISE = new Set([
  'with',
  'from',
  'your',
  'this',
  'that',
  'what',
  'about',
  'public',
  'talk',
  'event',
  'events',
  'night',
  'show',
  'live',
  'museum',
  'hamilton',
  'waikato',
  'kirikiriroa',
]);

export function normalizeTitle(title: string): string {
  return tokens(title.replace(/\s*\(\d+\)\s*$/, '')).join(' ');
}

/**
 * Same title, one title inside the other ("Quiz Night" in "Quiz Night at
 * Eterna"), or at least two shared key words making up half of the shorter
 * title ("Public Talk: The Algorithmic Brush" and "The Algorithmic Brush: AI
 * and the social foundations of creativity").
 */
export function isSameTitle(left: string, right: string): boolean {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  if (a === b) return true;
  if (Math.min(a.length, b.length) >= 8 && (a.includes(b) || b.includes(a))) {
    return true;
  }
  const leftWords = keyWords(a);
  const rightWords = keyWords(b);
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  return shared >= 2 && shared * 2 >= Math.min(leftWords.size, rightWords.size);
}

function keyWords(normalized: string): Set<string> {
  return new Set(
    normalized
      .split(' ')
      .filter((word) => word.length >= 4 && !TITLE_NOISE.has(word)),
  );
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

const STREET_ABBREVIATIONS: Record<string, string> = {
  st: 'street',
  rd: 'road',
  ave: 'avenue',
  dr: 'drive',
  pl: 'place',
  tce: 'terrace',
  cres: 'crescent',
};

function streetLine(address: string | null): string | null {
  const first = address?.split(',')[0];
  const normalized = first
    ? tokens(first)
        .map((token) => STREET_ABBREVIATIONS[token] ?? token)
        .join(' ')
    : '';
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

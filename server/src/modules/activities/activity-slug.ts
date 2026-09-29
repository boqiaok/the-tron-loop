import slugify from 'slugify';

export const MAX_SLUG_LENGTH = 220;

export function createSlug(value: string): string {
  return slugify(value, {
    lower: true,
    strict: true,
    trim: true,
  });
}

/**
 * The slug for `title`, numbered "-2", "-3", ... when an earlier activity
 * already uses it.
 */
export async function findAvailableSlug(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base =
    createSlug(title)
      .slice(0, MAX_SLUG_LENGTH - 4)
      .replace(/-+$/, '') || 'activity';
  let slug = base;
  for (let n = 2; await isTaken(slug); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

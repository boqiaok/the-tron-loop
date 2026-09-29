import { findAvailableSlug, MAX_SLUG_LENGTH } from './activity-slug';

describe('findAvailableSlug', () => {
  const takenFrom = (slugs: string[]) => (slug: string) =>
    Promise.resolve(slugs.includes(slug));

  it('uses the title alone when it is free', async () => {
    await expect(
      findAvailableSlug('Comic Book Month Competition', takenFrom([])),
    ).resolves.toBe('comic-book-month-competition');
  });

  it('numbers the slug when earlier activities share the title', async () => {
    await expect(
      findAvailableSlug('Storytime', takenFrom(['storytime', 'storytime-2'])),
    ).resolves.toBe('storytime-3');
  });

  it('keeps long titles within the slug limit', async () => {
    const slug = await findAvailableSlug('word '.repeat(100), takenFrom([]));
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('falls back when the title has no slug characters', async () => {
    await expect(findAvailableSlug('!!!', takenFrom([]))).resolves.toBe(
      'activity',
    );
  });
});

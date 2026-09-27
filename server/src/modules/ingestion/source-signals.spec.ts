import { NO_SOURCE_SIGNALS, readSourceSignals } from './source-signals';
import { SourceType } from './source-type.enum';

describe('readSourceSignals', () => {
  it('reads organizer, sold-out, featured and performers from Eventfinda', () => {
    expect(
      readSourceSignals(SourceType.Eventfinda, {
        username: ' COW ',
        is_sold_out: true,
        is_featured: true,
        artists: {
          artists: [{ name: 'Tusiata Avia' }],
          '@attributes': { count: 1 },
        },
      }),
    ).toEqual({
      organizer: 'cow',
      soldOut: true,
      featured: true,
      performerCount: 1,
    });
  });

  it('reports no signals for sources that do not provide them', () => {
    expect(
      readSourceSignals(SourceType.HamiltonLibraries, { is_sold_out: true }),
    ).toEqual(NO_SOURCE_SIGNALS);
  });
});

import {
  mergeSourceSignals,
  NO_SOURCE_SIGNALS,
  readSourceSignals,
} from './source-signals';
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
      curated: false,
    });
  });

  it('marks HLive listings as curated and reads its sold-out badge', () => {
    expect(readSourceSignals(SourceType.Hlive, { status: 'sold-out' })).toEqual(
      { ...NO_SOURCE_SIGNALS, soldOut: true, curated: true },
    );
    expect(
      readSourceSignals(SourceType.Hlive, { status: 'on-sale-now' }),
    ).toEqual({ ...NO_SOURCE_SIGNALS, curated: true });
  });

  it('reports no signals for sources that do not provide them', () => {
    expect(
      readSourceSignals(SourceType.HamiltonLibraries, { is_sold_out: true }),
    ).toEqual(NO_SOURCE_SIGNALS);
  });
});

describe('mergeSourceSignals', () => {
  it('keeps the first organizer and any flag a source reports', () => {
    expect(
      mergeSourceSignals([
        { ...NO_SOURCE_SIGNALS, organizer: 'cow', performerCount: 2 },
        { ...NO_SOURCE_SIGNALS, organizer: 'other', curated: true },
        { ...NO_SOURCE_SIGNALS, soldOut: true, performerCount: 1 },
      ]),
    ).toEqual({
      organizer: 'cow',
      soldOut: true,
      featured: false,
      performerCount: 2,
      curated: true,
    });
  });

  it('reports no signals when no source sent any', () => {
    expect(mergeSourceSignals([])).toEqual(NO_SOURCE_SIGNALS);
  });
});

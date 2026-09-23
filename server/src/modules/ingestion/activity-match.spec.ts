import { isSameTitle, isSameVenue, normalizeTitle } from './activity-match';

describe('activity matching', () => {
  it('normalises punctuation, macrons and numbered copies in titles', () => {
    expect(normalizeTitle('Quiz Night (4)')).toBe('quiz night');
    expect(isSameTitle('Waiata in Te Pātaka!', 'waiata in te pataka')).toBe(
      true,
    );
    expect(isSameTitle('Rock & Roll Night', 'Rock and Roll Night')).toBe(true);
    expect(isSameTitle('LEGO Club', 'LEGO Club Junior')).toBe(false);
  });

  it('matches venue names that add a te reo name or city', () => {
    expect(
      isSameVenue(
        { name: 'Chartwell Library - Kukutaaruhe', address: null },
        { name: 'Chartwell Library', address: '5 Lynden Court, Chartwell' },
      ),
    ).toBe(true);
    expect(
      isSameVenue(
        { name: 'Hamilton Central Library', address: null },
        {
          name: 'Central Library - Te Koopuu Maania o Kirikiriroa',
          address: null,
        },
      ),
    ).toBe(true);
  });

  it('matches differently named venues at the same street address', () => {
    expect(
      isSameVenue(
        { name: 'Te Kete Aronui', address: '30 North City Road, Hamilton' },
        { name: 'Rototuna Library', address: '30 North City Road' },
      ),
    ).toBe(true);
  });

  it('keeps different venues apart', () => {
    expect(
      isSameVenue(
        { name: 'The Bank Bar', address: '117 Victoria Street, Hamilton' },
        { name: 'Good George', address: '32 Somerset Street, Hamilton' },
      ),
    ).toBe(false);
    expect(
      isSameVenue(
        { name: 'Chartwell Library', address: 'Hamilton' },
        { name: 'Glenview Library', address: 'Hamilton' },
      ),
    ).toBe(false);
  });

  it('does not let a missing venue block a match', () => {
    expect(isSameVenue(null, { name: 'Glenview Library', address: null })).toBe(
      true,
    );
  });
});

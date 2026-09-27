import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import {
  diffSnapshots,
  findAddedDates,
  SourceChangeKind,
  SourceSnapshot,
  withAddedDates,
} from './source-snapshot';

const now = new Date('2026-10-01T00:00:00.000Z');
const day = (date: number) =>
  new Date(Date.UTC(2026, 9, date, 7)).toISOString();

function snapshot(overrides: Partial<SourceSnapshot> = {}): SourceSnapshot {
  return {
    title: "Farmers' Market",
    venue: { name: 'Claudelands Event Centre', address: 'Brooklyn Road' },
    costType: ActivityCostType.Free,
    costAmountFrom: null,
    cancelled: false,
    dates: [day(4), day(11), day(18)],
    windowEnd: day(21),
    ...overrides,
  };
}

describe('diffSnapshots', () => {
  it('reports nothing when the source still matches', () => {
    expect(diffSnapshots(snapshot(), snapshot(), now)).toEqual([]);
  });

  it('ignores the import window moving on', () => {
    const later = snapshot({
      dates: [day(11), day(18), day(25)],
      windowEnd: day(28),
    });
    expect(
      diffSnapshots(snapshot(), later, new Date(Date.UTC(2026, 9, 8))),
    ).toEqual([]);
  });

  it('reports an upcoming date the source no longer lists', () => {
    expect(
      diffSnapshots(snapshot(), snapshot({ dates: [day(4), day(18)] }), now),
    ).toEqual([
      {
        kind: SourceChangeKind.DatesRemoved,
        before: null,
        after: null,
        dates: [day(11)],
      },
    ]);
  });

  it('ignores accepted dates beyond the newer window', () => {
    const accepted = snapshot({ dates: [day(4), day(25)], windowEnd: day(28) });
    const current = snapshot({ dates: [day(4)], windowEnd: day(21) });
    expect(diffSnapshots(accepted, current, now)).toEqual([]);
  });

  it('reports only cancellation when the source cancels', () => {
    expect(
      diffSnapshots(snapshot(), snapshot({ cancelled: true, dates: [] }), now),
    ).toEqual([
      {
        kind: SourceChangeKind.Cancelled,
        before: null,
        after: null,
        dates: [],
      },
    ]);
  });

  it('reports a move to another venue but not a renamed one', () => {
    expect(
      diffSnapshots(
        snapshot(),
        snapshot({ venue: { name: 'The Meteor', address: '1 Victoria St' } }),
        now,
      ).map(({ kind, before, after }) => ({ kind, before, after })),
    ).toEqual([
      {
        kind: SourceChangeKind.Venue,
        before: 'Claudelands Event Centre',
        after: 'The Meteor',
      },
    ]);
    expect(
      diffSnapshots(
        snapshot(),
        snapshot({
          venue: { name: 'Claudelands', address: 'Brooklyn Road' },
        }),
        now,
      ),
    ).toEqual([]);
  });

  it('reports a new title but not a change of case or spacing', () => {
    expect(
      diffSnapshots(snapshot(), snapshot({ title: "farmers'  market" }), now),
    ).toEqual([]);
    expect(
      diffSnapshots(snapshot(), snapshot({ title: 'Night Market' }), now)[0],
    ).toMatchObject({
      kind: SourceChangeKind.Title,
      before: "Farmers' Market",
      after: 'Night Market',
    });
  });

  it('reports a change in cost', () => {
    expect(
      diffSnapshots(
        snapshot(),
        snapshot({ costType: ActivityCostType.Paid, costAmountFrom: 5 }),
        now,
      )[0],
    ).toMatchObject({
      kind: SourceChangeKind.Cost,
      before: 'Free',
      after: 'From $5.00',
    });
  });
});

describe('findAddedDates', () => {
  it('finds upcoming dates the accepted listing lacks', () => {
    const current = snapshot({ dates: [day(4), day(11), day(18), day(25)] });
    expect(findAddedDates(snapshot(), current, now)).toEqual([day(25)]);
  });

  it('accepts added dates and extends the known window', () => {
    const current = snapshot({
      dates: [day(11), day(18), day(25)],
      windowEnd: day(28),
    });
    const accepted = withAddedDates(snapshot(), current, [day(25)]);
    expect(accepted.dates).toEqual([day(4), day(11), day(18), day(25)]);
    expect(accepted.windowEnd).toBe(day(28));
    // The 25th is now accepted, so dropping it later is a change.
    expect(
      diffSnapshots(
        accepted,
        snapshot({ dates: [day(11), day(18)], windowEnd: day(28) }),
        new Date(Date.UTC(2026, 9, 8)),
      )[0],
    ).toMatchObject({
      kind: SourceChangeKind.DatesRemoved,
      dates: [day(25)],
    });
  });
});

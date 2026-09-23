import { earliestFit, generatePlan, validatePlan } from './plan-engine';

const fixed = {
  id: 'fixed',
  scheduleMode: 'fixed' as const,
  sourceStart: new Date('2026-09-19T02:00:00Z'),
  sourceEnd: new Date('2026-09-19T03:00:00Z'),
  visitMinutes: null,
};
const flexible = {
  id: 'window',
  scheduleMode: 'window' as const,
  sourceStart: new Date('2026-09-19T00:00:00Z'),
  sourceEnd: new Date('2026-09-19T06:00:00Z'),
  visitMinutes: 60,
};

describe('plan engine', () => {
  it('places a flexible visit before a fixed session without occupying its whole window', () => {
    const plan = generatePlan(
      [fixed, flexible],
      new Date('2026-09-19T00:00:00Z'),
      new Date('2026-09-19T06:00:00Z'),
      () => 10,
      10,
    );

    expect(plan?.map(({ item }) => item.id)).toEqual(['window', 'fixed']);
    expect(plan?.[0].start.toISOString()).toBe('2026-09-19T00:00:00.000Z');
    expect(plan?.[0].end.toISOString()).toBe('2026-09-19T01:00:00.000Z');
  });

  it('rejects a flexible visit that cannot fit before closing', () => {
    expect(
      earliestFit(
        flexible,
        new Date('2026-09-19T05:30:00Z'),
        new Date('2026-09-19T07:00:00Z'),
      ),
    ).toBeNull();
  });

  it('fits a visit longer than its session as the whole session', () => {
    const talk = {
      id: 'talk',
      scheduleMode: 'window' as const,
      sourceStart: new Date('2026-09-19T22:30:00Z'),
      sourceEnd: new Date('2026-09-19T23:30:00Z'),
      visitMinutes: 90,
    };
    const fit = earliestFit(
      talk,
      new Date('2026-09-19T12:00:00Z'),
      new Date('2026-09-20T11:59:00Z'),
    );

    expect(fit?.start.toISOString()).toBe('2026-09-19T22:30:00.000Z');
    expect(fit?.end.toISOString()).toBe('2026-09-19T23:30:00.000Z');
  });

  it('uses one validation rule for overlap and travel conflicts', () => {
    const conflicts = validatePlan(
      [
        {
          item: flexible,
          start: new Date('2026-09-19T01:30:00Z'),
          end: new Date('2026-09-19T02:30:00Z'),
        },
        { item: fixed, start: fixed.sourceStart, end: fixed.sourceEnd },
      ],
      new Date('2026-09-19T00:00:00Z'),
      new Date('2026-09-19T06:00:00Z'),
      () => 5,
      10,
    );

    expect(conflicts).toEqual([
      { code: 'OVERLAP', activityDateIds: ['window', 'fixed'] },
    ]);
  });
});

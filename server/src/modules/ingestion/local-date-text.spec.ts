import { parseLocalDateText } from './local-date-text';

const SEPTEMBER_22 = new Date('2026-09-22T00:00:00.000Z').getTime();

describe('parseLocalDateText', () => {
  it('reads library sessions with narrow no-break spaces in NZ time', () => {
    expect(
      parseLocalDateText(
        'Wednesday 23 September',
        '3:30\u202fPM to 4:30\u202fPM',
        SEPTEMBER_22,
      ),
    ).toEqual({
      startsAt: '2026-09-23T03:30:00.000Z',
      endsAt: '2026-09-23T04:30:00.000Z',
      timezone: 'Pacific/Auckland',
      isAllDay: false,
    });
  });

  it('applies daylight saving from the last Sunday of September', () => {
    expect(
      parseLocalDateText(
        'Wednesday 30 September',
        '3:30 PM to 4:30 PM',
        SEPTEMBER_22,
      ).startsAt,
    ).toBe('2026-09-30T02:30:00.000Z');
  });

  it('treats "All day" and missing times as all-day sessions', () => {
    const expected = {
      startsAt: '2026-09-22T12:00:00.000Z',
      endsAt: null,
      timezone: 'Pacific/Auckland',
      isAllDay: true,
    };
    expect(
      parseLocalDateText('Wednesday 23 September', 'All day', SEPTEMBER_22),
    ).toEqual(expected);
    expect(parseLocalDateText('23 September', null, SEPTEMBER_22)).toEqual(
      expected,
    );
  });

  it('rolls dates without a year into next year once they are long past', () => {
    const december = new Date('2026-12-20T00:00:00.000Z').getTime();
    expect(
      parseLocalDateText('Tuesday 5 January', '10:00 AM to 11:00 AM', december)
        .startsAt,
    ).toBe('2027-01-04T21:00:00.000Z');
  });

  it('rejects a weekday that does not match the inferred date', () => {
    expect(() =>
      parseLocalDateText(
        'Monday 23 September',
        '3:30 PM to 4:30 PM',
        SEPTEMBER_22,
      ),
    ).toThrow('weekday does not match 2026');
  });

  it.each([
    ['7:30pm - 9:30pm', '2026-09-25T07:30:00.000Z', '2026-09-25T09:30:00.000Z'],
    ['10.30am to 12pm', '2026-09-24T22:30:00.000Z', '2026-09-25T00:00:00.000Z'],
    ['11 - 1pm', '2026-09-24T23:00:00.000Z', '2026-09-25T01:00:00.000Z'],
    ['10 to 11:30am', '2026-09-24T22:00:00.000Z', '2026-09-24T23:30:00.000Z'],
    ['11pm - 1am', '2026-09-25T11:00:00.000Z', '2026-09-25T13:00:00.000Z'],
    ['7pm', '2026-09-25T07:00:00.000Z', null],
  ])('reads the time range "%s"', (time, startsAt, endsAt) => {
    expect(parseLocalDateText('Fri 25 Sep', time, SEPTEMBER_22)).toMatchObject({
      startsAt,
      endsAt,
    });
  });

  it('rejects unreadable text', () => {
    expect(() => parseLocalDateText('Next Friday', null, SEPTEMBER_22)).toThrow(
      'Unrecognised date',
    );
    expect(() =>
      parseLocalDateText('Fri 25 Sep', 'after lunch', SEPTEMBER_22),
    ).toThrow('Unrecognised time');
  });
});

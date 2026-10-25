import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { Source } from './entities/source.entity';
import { getImportWindow } from './import-window';
import {
  HliveAdapter,
  mapHliveActivity,
  parseGenres,
  parseHlivePage,
  parseHliveSessions,
  parseListing,
  toHliveRecord,
} from './hlive.adapter';
import { SourceType } from './source-type.enum';

jest.mock('./source-http', () => ({
  ...jest.requireActual<typeof import('./source-http')>('./source-http'),
  delay: jest.fn().mockResolvedValue(undefined),
}));

const FEED_URL = 'https://hlive.co.nz/events';
// Monday 26 October 2026, 9am in Auckland.
const NOW = new Date('2026-10-25T20:00:00.000Z').getTime();
const WINDOW = getImportWindow(NOW);

// Trimmed from https://hlive.co.nz/events
const LISTING_HTML = `<main>
  <select name="genre">
    <option selected value="">Event type</option>
    <option value="3">Music</option>
    <option value="22">Free</option>
    <option value="all">Any type</option>
  </select>
  <div class="event-tile">
    <a class="event-tile-image" href="/events/the-ninja-run-hamilton"><img alt="The Ninja Run"></a>
    <a href="/events/the-ninja-run-hamilton">The Ninja Run | Hamilton</a>
  </div>
  <div class="event-tile">
    <a class="event-tile-image" href="/events/chase-and-status"><img alt="Chase"></a>
  </div>
  <a href="/events/not-a-tile">Footer link</a>
  <div class="event-tile"><a href="https://example.com/events/elsewhere">Elsewhere</a></div>
</main>`;

// Trimmed from https://hlive.co.nz/events/the-ninja-run-hamilton
function pageHtml(times: string, status = 'on-sale-now'): string {
  return `<main class="main-wrap">
    <div class="banner container">
      <div class="banner-image">
        <img alt="The Ninja Run | Hamilton" src="/assets/event-banner-photos/ninja.webp">
        <img alt="${status}" src="/images/banners/${status}-2.svg" class="banner-status">
      </div>
      <div class="banner-content">
        <h2 class="banner-title">The Ninja Run | Hamilton</h2>
        <p class="banner-date"> 06 NOV - 08 NOV </p>
        <p class="banner-location"><a href="http://www.claudelands.co.nz/events"> Claudeland Oval - Claudelands</a></p>
      </div>
    </div>
    <div class="event-layout container">
      <div class="event-content">
        <div class="x14z9mp">The Ninja Run is coming back to Hamilton!</div>
        <div class="x14z9mp">EVERY ticket includes:</div>
        <ul><li class="x14z9mp">Unlimited laps on the obstacle course</li></ul>
      </div>
      <div class="event-cards">
        <div class="event-card">
          <h2 class="event-card-title">Event times</h2>
          <div class="event-card-times">${times}</div>
        </div>
        <div class="event-card">
          <h2 class="event-card-title">Claudelands</h2>
          <div class="event-card-venue-info">
            <p class="event-card-location">Corner of Brooklyn Road and Heaphy Terrace <br> Claudelands <br> Hamilton 3214 <br> New Zealand </p>
          </div>
        </div>
      </div>
    </div>
  </main>`;
}

function timesSection(days: string, ...times: string[]): string {
  const content = times.length
    ? `<div class="event-card-times-content"><ul class="event-time-list">${times
        .map((time) => `<li>${time}</li>`)
        .join('')}</ul></div>`
    : '<p class="event-times-tbh">To be announced</p>';
  return `<div class="event-card-times-section">
    <div class="event-card-times-date"> ${days} </div>${content}
  </div>`;
}

const RANGE_TIMES = timesSection('06 NOV 26 - 08 NOV 26', '9am - 7pm');

describe('HliveAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads event page links from the event tiles only', () => {
    expect(parseListing(LISTING_HTML, FEED_URL)).toEqual([
      'https://hlive.co.nz/events/the-ninja-run-hamilton',
      'https://hlive.co.nz/events/chase-and-status',
    ]);
  });

  it('reads the event types offered by the event finder', () => {
    expect(parseGenres(LISTING_HTML)).toEqual([
      { id: '3', name: 'Music' },
      { id: '22', name: 'Free' },
    ]);
  });

  it('reads the title, text, image, status, venue and times', () => {
    expect(
      parseHlivePage(
        pageHtml(RANGE_TIMES),
        'https://hlive.co.nz/events/the-ninja-run-hamilton',
      ),
    ).toEqual({
      title: 'The Ninja Run',
      description: [
        'The Ninja Run is coming back to Hamilton!',
        'EVERY ticket includes:',
        'Unlimited laps on the obstacle course',
      ].join('\n\n'),
      imageUrl: 'https://hlive.co.nz/assets/event-banner-photos/ninja.webp',
      status: 'on-sale-now',
      place: 'Claudeland Oval',
      venueName: 'Claudelands',
      venueAddress:
        'Corner of Brooklyn Road and Heaphy Terrace, Claudelands, Hamilton 3214',
      sessions: [{ days: '06 NOV 26 - 08 NOV 26', times: ['9am - 7pm'] }],
    });
  });

  it('repeats the times on each day of a range', () => {
    const dates = parseHliveSessions(
      [{ days: '06 NOV 26 - 08 NOV 26', times: ['9am - 7pm'] }],
      WINDOW,
      NOW,
    );
    expect(dates.map(({ startsAt, endsAt }) => [startsAt, endsAt])).toEqual([
      ['2026-11-05T20:00:00.000Z', '2026-11-06T06:00:00.000Z'],
      ['2026-11-06T20:00:00.000Z', '2026-11-07T06:00:00.000Z'],
      ['2026-11-07T20:00:00.000Z', '2026-11-08T06:00:00.000Z'],
    ]);
  });

  it('lists each time on a day and makes unannounced times all day', () => {
    const dates = parseHliveSessions(
      [
        { days: '31 OCT 26', times: ['10am', '1pm'] },
        { days: '01 NOV 26', times: [] },
      ],
      WINDOW,
      NOW,
    );
    expect(dates.map(({ startsAt, isAllDay }) => [startsAt, isAllDay])).toEqual(
      [
        ['2026-10-30T21:00:00.000Z', false],
        ['2026-10-31T00:00:00.000Z', false],
        ['2026-10-31T11:00:00.000Z', true],
      ],
    );
  });

  it('reads the first time in free text and makes a line without one all day', () => {
    const dates = parseHliveSessions(
      [
        { days: '30 OCT 26', times: ['Fri & Sat 9am - 5pm | Sun 9am - 4pm'] },
        { days: '06 NOV 26', times: ['6 & 7 November'] },
      ],
      WINDOW,
      NOW,
    );
    expect(
      dates.map(({ startsAt, endsAt, isAllDay }) => [
        startsAt,
        endsAt,
        isAllDay,
      ]),
    ).toEqual([
      ['2026-10-29T20:00:00.000Z', '2026-10-30T04:00:00.000Z', false],
      ['2026-11-05T11:00:00.000Z', null, true],
    ]);
  });

  it('reads the four-letter "SEPT" month', () => {
    expect(
      parseHliveSessions(
        [{ days: '14 SEPT 27', times: [] }],
        { ...WINDOW, endsAt: '2027-12-31T00:00:00.000Z' },
        NOW,
      ).map(({ startsAt }) => startsAt),
    ).toEqual(['2027-09-13T12:00:00.000Z']);
  });

  it('keeps only sessions inside the import window', () => {
    expect(
      parseHliveSessions(
        [
          { days: '20 OCT 26', times: ['4pm - 8pm'] },
          { days: '06 MAR 27', times: [] },
        ],
        WINDOW,
        NOW,
      ),
    ).toEqual([]);
  });

  it('rejects a day it cannot read', () => {
    expect(() =>
      parseHliveSessions([{ days: 'Every Sunday', times: [] }], WINDOW, NOW),
    ).toThrow('HLive has an unreadable date "Every Sunday"');
  });

  it('maps a page to an activity at the venue with its event types', () => {
    const url = 'https://hlive.co.nz/events/the-ninja-run-hamilton';
    const record = toHliveRecord(
      parseHlivePage(pageHtml(RANGE_TIMES), url),
      url,
      ['Family', 'Free'],
    );
    const activity = mapHliveActivity(record, NOW);

    expect(activity).toMatchObject({
      externalId: 'the-ninja-run-hamilton',
      title: 'The Ninja Run',
      summary: 'The Ninja Run is coming back to Hamilton!',
      category: ActivityCategory.Family,
      sourceUrl: url,
      venue: {
        name: 'Claudelands',
        address:
          'Corner of Brooklyn Road and Heaphy Terrace, Claudelands, Hamilton 3214',
        suburb: null,
        latitude: -37.7791,
        longitude: 175.2891,
      },
      tags: ['Family'],
      costType: ActivityCostType.Free,
      costAmountFrom: 0,
      isCancelled: false,
    });
    expect(activity.description).toMatch(/\n\nWhere: Claudeland Oval\.$/);
    expect(activity.dates).toHaveLength(3);
  });

  it('leaves the cost unknown without the Free type and reads a cancellation', () => {
    const url = 'https://hlive.co.nz/events/the-ninja-run-hamilton';
    const record = toHliveRecord(
      parseHlivePage(pageHtml(RANGE_TIMES, 'cancelled'), url),
      url,
      [],
    );
    expect(mapHliveActivity(record, NOW)).toMatchObject({
      costType: ActivityCostType.Unknown,
      costAmountFrom: null,
      costDetails: null,
      isCancelled: true,
    });
  });

  it('fetches the listing, each event type and the pages with sessions', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    const pages: Record<string, string> = {
      [FEED_URL]: LISTING_HTML,
      'https://hlive.co.nz/search/events?genre=3': '<main></main>',
      'https://hlive.co.nz/search/events?genre=22': `<main><div class="event-tile"><a href="/events/the-ninja-run-hamilton">Ninja</a></div></main>`,
      'https://hlive.co.nz/events/the-ninja-run-hamilton':
        pageHtml(RANGE_TIMES),
      'https://hlive.co.nz/events/chase-and-status': pageHtml(
        timesSection('06 MAR 27'),
      ),
    };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation((input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : input.toString();
        return Promise.resolve(new Response(pages[url] ?? ''));
      });

    const records = await new HliveAdapter().fetch({
      feedUrl: FEED_URL,
      sourceType: SourceType.Hlive,
    } as Source);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      externalId: 'the-ninja-run-hamilton',
      genres: ['Free'],
    });
  });
});

import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { Source } from './entities/source.entity';
import {
  HamiltonLibrariesAdapter,
  mapLibraryActivity,
  parseEventListing,
  parseEventPage,
  parseLibraryAddress,
  toLibraryRecords,
} from './hamilton-libraries.adapter';
import { SourceType } from './source-type.enum';

jest.mock('./source-http', () => ({
  ...jest.requireActual<typeof import('./source-http')>('./source-http'),
  delay: jest.fn().mockResolvedValue(undefined),
}));

const FEED_URL = 'https://hamiltonlibraries.co.nz/all-events/whats-on';
const EVENT_URL = `${FEED_URL}/lego-club`;
const NOW = new Date('2026-09-22T00:00:00.000Z').getTime();

// Trimmed from the live listing fragment returned by /loadmore.
const LISTING_HTML = `
  <a href="/all-events/whats-on/lego-club" class="flex flex-col">
    <img src="/assets/Whats-On-Images/LEGO-Club.webp" alt="">
    <h3>LEGO Club</h3>
  </a>
  <a href="/all-events/whats-on/lego-club#details">More</a>
  <a href="/all-events/whats-on/storytime?utm_source=x">Storytime</a>
  <a href="/whats-on/event-calendar?audiences[adults]=adults">Adults</a>
  <a href="https://example.com/all-events/whats-on/elsewhere">Elsewhere</a>`;

// Trimmed from https://hamiltonlibraries.co.nz/all-events/whats-on/lego-club
function eventHtml(glenviewTime = '3:30\u202fPM to 4:30\u202fPM'): string {
  return `<!DOCTYPE html><html><body>
  <header><h3>Menu</h3></header>
  <main id="main-content">
    <img src="/assets/Whats-On-Images/LEGO-Club__FocusFill.webp" alt="">
    <h1>LEGO Club</h1>
    <div class="flex flex-col gap-line default-list">
      <p>LEGO Club&nbsp;<strong>encourages children to learn</strong>!</p>
      <p>All LEGO will be provided.</p>
    </div>
    <div class="relative z-10 bg-hcl-mint">
      <div><span class="text-sm font-bold">Type of Event</span>
        <span>Creativity, Recreational events</span></div>
      <div><span class="text-sm font-bold">Who&#039;s it for</span>
        <span>Children</span></div>
      <div><span class="text-sm font-bold">Cost</span><span>Free</span></div>
    </div>
    <div class="flex flex-col gap-6 lg:gap-9">
      <h2 class="h4">Location dates and times</h2>
      <div class="flex flex-col bg-hcl-light-gray">
        <div class="flex flex-col gap-2">
          <h3 class="h5">Chartwell Library - Kukutaaruhe</h3>
          <a href="/location-and-hours/chartwell-library"><span class="underline">Go to library</span></a>
        </div>
        <ul>
          <li><span class="font-bold">Thursday 24 September</span><span>3:30\u202fPM to 4:30\u202fPM</span></li>
          <li><span class="font-bold">Thursday 17 December</span><span>3:30\u202fPM to 4:30\u202fPM</span></li>
        </ul>
      </div>
      <div class="flex flex-col bg-hcl-light-gray">
        <div class="flex flex-col gap-2">
          <h3 class="h5">Glenview Library - Mangakootukutuku</h3>
          <a href="/location-and-hours/glenview-library"><span class="underline">Go to library</span></a>
        </div>
        <ul>
          <li><span class="font-bold">Wednesday 23 September</span><span>${glenviewTime}</span></li>
        </ul>
      </div>
    </div>
  </main></body></html>`;
}

const LIBRARY_HTML = `<main><a href="https://www.google.com/maps/dir/?api=1&amp;destination=5+Lynden+Court%2C+Chartwell%2C+Hamilton%2C+New+Zealand">Directions</a></main>`;

describe('HamiltonLibrariesAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps unique event links on the listing site only', () => {
    expect(parseEventListing(LISTING_HTML, FEED_URL)).toEqual([
      EVENT_URL,
      `${FEED_URL}/storytime`,
    ]);
  });

  it('reads the event page fields and each library schedule', () => {
    const page = parseEventPage(eventHtml(), EVENT_URL);
    expect(page).toMatchObject({
      title: 'LEGO Club',
      description:
        'LEGO Club encourages children to learn!\n\nAll LEGO will be provided.',
      imageUrl:
        'https://hamiltonlibraries.co.nz/assets/Whats-On-Images/LEGO-Club__FocusFill.webp',
      eventTypes: ['Creativity', 'Recreational events'],
      audiences: ['Children'],
      cost: 'Free',
    });
    expect(page.locations).toEqual([
      {
        name: 'Chartwell Library - Kukutaaruhe',
        libraryUrl:
          'https://hamiltonlibraries.co.nz/location-and-hours/chartwell-library',
        sessions: [
          { day: 'Thursday 24 September', time: '3:30 PM to 4:30 PM' },
          { day: 'Thursday 17 December', time: '3:30 PM to 4:30 PM' },
        ],
      },
      {
        name: 'Glenview Library - Mangakootukutuku',
        libraryUrl:
          'https://hamiltonlibraries.co.nz/location-and-hours/glenview-library',
        sessions: [
          { day: 'Wednesday 23 September', time: '3:30 PM to 4:30 PM' },
        ],
      },
    ]);
  });

  it('reads a library address from its directions link', () => {
    expect(parseLibraryAddress(LIBRARY_HTML)).toBe(
      '5 Lynden Court, Chartwell, Hamilton',
    );
    expect(parseLibraryAddress('<main></main>')).toBeNull();
  });

  it('maps one library schedule to a free family activity at that library', () => {
    const page = parseEventPage(eventHtml(), EVENT_URL);
    const [chartwell] = toLibraryRecords(
      page,
      EVENT_URL,
      page.locations,
      new Map([
        [page.locations[0].libraryUrl!, '5 Lynden Court, Chartwell, Hamilton'],
      ]),
    );
    const activity = mapLibraryActivity(chartwell, NOW);

    expect(activity).toMatchObject({
      externalId: 'lego-club#chartwell-library',
      title: 'LEGO Club',
      summary: 'LEGO Club encourages children to learn!',
      category: ActivityCategory.Family,
      sourceUrl: EVENT_URL,
      venue: {
        name: 'Chartwell Library - Kukutaaruhe',
        address: '5 Lynden Court, Chartwell, Hamilton',
        latitude: -37.75155,
        longitude: 175.27829,
      },
      tags: ['Creativity', 'Recreational events', 'Children'],
      costType: ActivityCostType.Free,
      costAmountFrom: 0,
      isCancelled: false,
    });
    // 17 December is outside the 21-day import window.
    expect(activity.dates).toEqual([
      {
        startsAt: '2026-09-24T03:30:00.000Z',
        endsAt: '2026-09-24T04:30:00.000Z',
        timezone: 'Pacific/Auckland',
        isAllDay: false,
      },
    ]);
  });

  it('merges libraries that share one schedule into a single activity', () => {
    const page = parseEventPage(eventHtml(), EVENT_URL);
    const shared = page.locations.map((location) => ({
      ...location,
      sessions: [{ day: 'Friday 25 September', time: 'All day' }],
    }));
    const records = toLibraryRecords(page, EVENT_URL, shared, new Map());

    expect(records).toHaveLength(1);
    const activity = mapLibraryActivity(records[0], NOW);
    expect(activity.externalId).toBe('lego-club');
    expect(activity.venue).toBeNull();
    expect(activity.description).toContain(
      'Available at: Chartwell Library - Kukutaaruhe, Glenview Library - Mangakootukutuku.',
    );
    expect(activity.dates[0].isAllDay).toBe(true);
  });

  it('parses a paid cost', () => {
    const page = parseEventPage(eventHtml(), EVENT_URL);
    const [record] = toLibraryRecords(
      { ...page, cost: '$15' },
      EVENT_URL,
      page.locations.slice(0, 1),
      new Map(),
    );
    expect(mapLibraryActivity(record, NOW)).toMatchObject({
      costType: ActivityCostType.Paid,
      costAmountFrom: 15,
      costDetails: '$15',
    });
  });

  it('pages the listing, reads each event and library once, and skips libraries outside the window', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    const glenviewLater = eventHtml('3:30\u202fPM to 4:30\u202fPM').replace(
      'Wednesday 23 September',
      'Wednesday 25 November',
    );
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation((input: string | URL | Request) => {
        const url = new URL(input instanceof Request ? input.url : input);
        if (url.pathname.endsWith('/loadmore')) {
          const first = url.searchParams.get('offset') === '0';
          return Promise.resolve(
            Response.json({
              html: first
                ? LISTING_HTML
                : `<a href="/all-events/whats-on/lego-club">LEGO</a>`,
              hasMore: first,
              totalResults: 3,
              nextOffset: 12,
            }),
          );
        }
        if (url.pathname.startsWith('/location-and-hours/')) {
          return Promise.resolve(new Response(LIBRARY_HTML));
        }
        return Promise.resolve(new Response(glenviewLater));
      });

    const records = await new HamiltonLibrariesAdapter().fetch(source());

    const requested = fetchMock.mock.calls.map(([input]) =>
      input instanceof Request ? input.url : input.toString(),
    );
    expect(requested[0]).toBe(
      `${FEED_URL}/loadmore?when=custom&start=2026-09-22&end=2026-10-12&offset=0`,
    );
    expect(requested.filter((url) => url.includes('/loadmore'))).toHaveLength(
      2,
    );
    expect(
      requested.filter((url) => url.includes('chartwell-library')),
    ).toHaveLength(1);
    expect(requested.some((url) => url.includes('glenview-library'))).toBe(
      false,
    );
    expect(records.map((record) => record.externalId)).toEqual([
      'lego-club#chartwell-library',
      'storytime#chartwell-library',
    ]);
  });
});

function source(): Source {
  return {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Hamilton Libraries',
    sourceType: SourceType.HamiltonLibraries,
    feedUrl: FEED_URL,
    enabled: true,
    scheduleHours: 24,
    lastRunAt: null,
  } as Source;
}

import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { ActivityEnvironment } from '../activities/enums/activity-environment.enum';
import { Source } from './entities/source.entity';
import {
  HamiltonGardensAdapter,
  mapGardensActivity,
  parseGardensPage,
  parseGardensSchedule,
  parseListing,
  toGardensRecord,
} from './hamilton-gardens.adapter';
import { getImportWindow } from './import-window';
import { SourceType } from './source-type.enum';

jest.mock('./source-http', () => ({
  ...jest.requireActual<typeof import('./source-http')>('./source-http'),
  delay: jest.fn().mockResolvedValue(undefined),
}));

const FEED_URL =
  'https://hamiltongardens.co.nz/things-to-see-and-do-in-hamilton/whats-on';
// Monday 26 October 2026, 9am in Auckland.
const NOW = new Date('2026-10-25T20:00:00.000Z').getTime();
const WINDOW = getImportWindow(NOW);

// Trimmed from the What's On page.
const LISTING_HTML = `<main>
  <a href="/things-to-see-and-do-in-hamilton">Things to See &amp; Do</a>
  <a href="/things-to-see-and-do-in-hamilton/whats-on/night-time-discovery" class="group">
    <div><img src="/assets/Uploads/Banners/night.jpg" alt=""></div>
    <div><h3>Night-time Discovery Walk at Hamilton Gardens</h3>
      <p>Join us for an enchanting tour through the Outer Gardens after dark.</p></div>
    <div><span class="text-sm font-bold">29 October 2026</span></div>
  </a>
  <a href="/things-to-see-and-do-in-hamilton/whats-on/scarecrow-festival" class="group">
    <div><h3>Hamilton Gardens Scarecrow Festival</h3><p>Fun will be sprouting up.</p></div>
    <div><span class="text-sm font-bold">1 November 2026</span></div>
  </a>
  <div class="pagination"><a href="?start=12">2</a><a href="https://example.com/?start=12">x</a></div>
</main>`;

// Trimmed from the night-time-discovery page.
const NIGHT_HTML = `<main>
  <div style="background-image: url(/assets/Uploads/Banners/night-banner.jpg)">
    <h1>Night-time Discovery Walk at Hamilton Gardens</h1>
  </div>
  <div id="e1208"><div>
    <h2>Discover the nightlife of Hamilton Gardens!</h2>
    <div><div>Step into Hamilton's nocturnal world on a guided tour.</div>
      <p><span><strong>Tour dates and times:&nbsp;</strong></span></p>
      <ul>
        <li><span>Thursday 29 October 2026 - 7:50pm arrival<br></span></li>
        <li><span>Thursday 5 November 2026 - 8:00pm arrival</span></li>
        <li><p><span>Thursday 28 January 2027 - 8:35pm arrival&nbsp;</span></p></li>
      </ul>
      <p><strong>Tour start time:</strong> Varies based on daylight savings.<br><strong>Cost:</strong> Adults $29.50 Children (8-15years) $19.00<br><strong>Meeting Point:</strong> Outside the Gallagher Visitor Centre</p>
    </div>
  </div></div>
  <div><h2>The best family-friendly events are held at Hamilton Gardens.</h2><a href="/whats-on">See All Events</a></div>
</main>`;

// Trimmed from the scarecrow-festival page.
const SCARECROW_HTML = `<main>
  <h1>Hamilton Gardens Scarecrow Festival</h1>
  <div id="e1195"><div><div>
    <p><span>Enter a scarecrow and vote for your favourite on Sunday 1 November between 11.00am - 2.00pm!</span></p>
    <ul><li>Scarecrows must be collected on Sunday 8 November between 10.00am - 3.00pm.</li></ul>
  </div></div></div>
</main>`;

describe('HamiltonGardensAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads event cards with their dates and further listing pages', () => {
    expect(parseListing(LISTING_HTML, FEED_URL)).toEqual({
      cards: [
        {
          url: `${FEED_URL}/night-time-discovery`,
          summary:
            'Join us for an enchanting tour through the Outer Gardens after dark.',
          date: '29 October 2026',
          imageUrl:
            'https://hamiltongardens.co.nz/assets/Uploads/Banners/night.jpg',
        },
        {
          url: `${FEED_URL}/scarecrow-festival`,
          summary: 'Fun will be sprouting up.',
          date: '1 November 2026',
          imageUrl: null,
        },
      ],
      pages: [`${FEED_URL}?start=12`],
    });
  });

  it('reads the title, banner and content lines but not the page chrome', () => {
    const page = parseGardensPage(
      NIGHT_HTML,
      `${FEED_URL}/night-time-discovery`,
    );
    expect(page.title).toBe('Night-time Discovery Walk at Hamilton Gardens');
    expect(page.imageUrl).toBe(
      'https://hamiltongardens.co.nz/assets/Uploads/Banners/night-banner.jpg',
    );
    expect(page.lines).toEqual([
      'Discover the nightlife of Hamilton Gardens!',
      "Step into Hamilton's nocturnal world on a guided tour.",
      'Tour dates and times:',
      'Thursday 29 October 2026 - 7:50pm arrival',
      'Thursday 5 November 2026 - 8:00pm arrival',
      'Thursday 28 January 2027 - 8:35pm arrival',
      'Tour start time: Varies based on daylight savings.',
      'Cost: Adults $29.50 Children (8-15years) $19.00',
      'Meeting Point: Outside the Gallagher Visitor Centre',
    ]);
  });

  it('reads session lines and keeps those inside the import window', () => {
    const { lines } = parseGardensPage(NIGHT_HTML, FEED_URL);
    expect(
      parseGardensSchedule('29 October 2026', lines, WINDOW, NOW).map(
        ({ startsAt, isAllDay }) => [startsAt, isAllDay],
      ),
    ).toEqual([
      ['2026-10-29T06:50:00.000Z', false],
      ['2026-11-05T07:00:00.000Z', false],
    ]);
  });

  it('takes the time given beside the card date when there are no session lines', () => {
    const { lines } = parseGardensPage(SCARECROW_HTML, FEED_URL);
    const [date] = parseGardensSchedule('1 November 2026', lines, WINDOW, NOW);
    expect(date).toEqual({
      startsAt: '2026-10-31T22:00:00.000Z',
      endsAt: '2026-11-01T01:00:00.000Z',
      timezone: 'Pacific/Auckland',
      isAllDay: false,
    });
  });

  it('holds an event all day on the card date when no time is given', () => {
    expect(
      parseGardensSchedule('1 November 2026', ['Come along.'], WINDOW, NOW),
    ).toEqual([
      {
        startsAt: '2026-10-31T11:00:00.000Z',
        endsAt: null,
        timezone: 'Pacific/Auckland',
        isAllDay: true,
      },
    ]);
  });

  it('maps a page to an outdoor activity at the gardens with its cost', () => {
    const [card] = parseListing(LISTING_HTML, FEED_URL).cards;
    const activity = mapGardensActivity(
      toGardensRecord(card, parseGardensPage(NIGHT_HTML, card.url)),
      NOW,
    );
    expect(activity).toMatchObject({
      externalId: 'night-time-discovery',
      title: 'Night-time Discovery Walk at Hamilton Gardens',
      summary:
        'Join us for an enchanting tour through the Outer Gardens after dark.',
      imageUrl:
        'https://hamiltongardens.co.nz/assets/Uploads/Banners/night-banner.jpg',
      environment: ActivityEnvironment.Outdoor,
      sourceUrl: card.url,
      venue: { name: 'Hamilton Gardens', address: 'Hungerford Crescent' },
      costType: ActivityCostType.Paid,
      costAmountFrom: 19,
      costDetails: 'Adults $29.50 Children (8-15years) $19.00',
    });
    expect(activity.dates).toHaveLength(2);
  });

  it('fetches every listing page and the event pages with sessions', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    const pages: Record<string, string> = {
      [FEED_URL]: LISTING_HTML,
      [`${FEED_URL}?start=12`]: '<main></main>',
      [`${FEED_URL}/night-time-discovery`]: NIGHT_HTML,
      [`${FEED_URL}/scarecrow-festival`]: SCARECROW_HTML,
    };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation((input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : input.toString();
        return Promise.resolve(new Response(pages[url] ?? ''));
      });

    const records = await new HamiltonGardensAdapter().fetch({
      feedUrl: FEED_URL,
      sourceType: SourceType.HamiltonGardens,
    } as Source);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(records.map((record) => record.externalId)).toEqual([
      'night-time-discovery',
      'scarecrow-festival',
    ]);
  });
});

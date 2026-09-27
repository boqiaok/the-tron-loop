import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { ActivityScheduleMode } from '../activities/enums/activity-schedule-mode.enum';
import { Source } from './entities/source.entity';
import { getImportWindow } from './import-window';
import { SourceType } from './source-type.enum';
import {
  mapMuseumActivity,
  parseListing,
  parseMuseumPage,
  parseMuseumSchedule,
  toMuseumRecord,
  WaikatoMuseumAdapter,
} from './waikato-museum.adapter';

jest.mock('./source-http', () => ({
  ...jest.requireActual<typeof import('./source-http')>('./source-http'),
  delay: jest.fn().mockResolvedValue(undefined),
}));

const FEED_URL = 'https://tewharetaonga.nz/whats-on';
// Sunday 27 September 2026, 9am in Auckland.
const NOW = new Date('2026-09-26T20:00:00.000Z').getTime();
const WINDOW = getImportWindow(NOW);

// Trimmed from https://tewharetaonga.nz/whats-on/events
const EVENTS_HTML = `<main>
  <div id="upcoming">
    <a href="/public/whats-on/events/fossils-tour"><h3>Fossils Tour</h3></a>
    <a href="/public/whats-on/events/fossils-tour"><p>Read more</p></a>
    <a href="/public/whats-on/exhibitions/fossil-finds">Exhibition</a>
    <a href="https://example.com/whats-on/events/elsewhere">Elsewhere</a>
  </div>
  <div id="past">
    <a href="/public/whats-on/events/matariki-2026"><h3>Matariki</h3></a>
  </div>
</main>`;

const EXHIBITIONS_HTML = `<main>
  <a href="/whats-on/exhibitions/fossil-finds">Fossil Finds</a>
  <a href="/whats-on/exhibitions/air-playground/air-playground-gift-voucher">Voucher</a>
</main>`;

// Trimmed from https://tewharetaonga.nz/public/whats-on/events/fossils-tour
function pageHtml(when: string, extra = ''): string {
  return `<main>
    <h1 class="super">He Koorero Maataatoka – Fossils Tour</h1>
    <div id="cost" class="text-[28px]">Free Entry</div>
    <p class="h3 lg:h2">Discover the fossils that shaped Waikato’s past</p>
    <div class="py-4" data-react-mount="hero" data-element-json="{&quot;images&quot;:[{&quot;url&quot;:&quot;https:\\/\\/tewharetaonga.nz\\/assets\\/Uploads\\/Banners\\/fossils-tour.webp&quot;}]}"></div>
    <div class="flex flex-col gap-6 default-list body-large"><p>Step back millions of years with a guided tour.</p></div>
    <div>
      <p class="button">Ua<br />
When</p>
      <p class="body-large">
        ${when}
      </p>
    </div>
    ${extra}
  </main>
  <div id="content"><div class="default-list"><p>The tour blends science and storytelling.</p></div></div>`;
}

describe('WaikatoMuseumAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads only upcoming event links and exhibition pages on the museum site', () => {
    expect(parseListing(EVENTS_HTML, `${FEED_URL}/events`, 'event')).toEqual([
      'https://tewharetaonga.nz/public/whats-on/events/fossils-tour',
    ]);
    expect(
      parseListing(EXHIBITIONS_HTML, `${FEED_URL}/exhibitions`, 'exhibition'),
    ).toEqual(['https://tewharetaonga.nz/whats-on/exhibitions/fossil-finds']);
  });

  it('reads the page title, text, hero image and details', () => {
    const page = parseMuseumPage(
      pageHtml(
        '3rd October 2026<br /> 10th October 2026<br/><br />2pm',
        `<div><p class="button">Noo hea<br />Where</p><p class="body-large">Meet in foyer</p></div>
         <div><p class="button">Utu<br />Cost</p><p class="body-large">Free entry</p></div>`,
      ),
      `${FEED_URL}/events/fossils-tour`,
    );

    expect(page).toEqual({
      title: 'He Koorero Maataatoka – Fossils Tour',
      tagline: 'Discover the fossils that shaped Waikato’s past',
      description:
        'Step back millions of years with a guided tour.\n\nThe tour blends science and storytelling.',
      imageUrl:
        'https://tewharetaonga.nz/assets/Uploads/Banners/fossils-tour.webp',
      when: ['3rd October 2026', '10th October 2026', '2pm'],
      where: 'Meet in foyer',
      cost: 'Free entry',
    });
  });

  it('maps an event to a fixed free session at the museum', () => {
    const page = parseMuseumPage(
      pageHtml(
        '3rd October 2026<br />7th November 2026<br />2pm',
        '<div><p class="button">Where</p><p class="body-large">Meet in foyer</p></div>',
      ),
      `${FEED_URL}/events/fossils-tour`,
    );
    const activity = mapMuseumActivity(
      toMuseumRecord(page, `${FEED_URL}/events/fossils-tour`, 'event'),
      NOW,
    );

    expect(activity).toMatchObject({
      externalId: 'event/fossils-tour',
      summary: 'Discover the fossils that shaped Waikato’s past',
      scheduleMode: ActivityScheduleMode.Fixed,
      visitMinutes: null,
      costType: ActivityCostType.Free,
      costDetails: 'Free Entry',
      venue: { name: 'Waikato Museum', address: '1 Grantham Street' },
    });
    expect(activity.description).toMatch(/Where: Meet in foyer\.$/);
    // 7 November is outside the 21-day import window.
    expect(activity.dates).toEqual([
      {
        startsAt: '2026-10-03T01:00:00.000Z',
        endsAt: null,
        timezone: 'Pacific/Auckland',
        isAllDay: false,
      },
    ]);
  });

  it('maps an exhibition to daily drop-in visits during opening hours', () => {
    const page = parseMuseumPage(
      pageHtml('1st August 2026 - 11th November 2026'),
      `${FEED_URL}/exhibitions/robin-white`,
    );
    const activity = mapMuseumActivity(
      toMuseumRecord(page, `${FEED_URL}/exhibitions/robin-white`, 'exhibition'),
      NOW,
    );

    expect(activity).toMatchObject({
      scheduleMode: ActivityScheduleMode.Window,
      visitMinutes: 60,
      category: ActivityCategory.ArtsMusic,
      tags: ['Exhibition', 'Museum'],
    });
    expect(activity.dates).toHaveLength(21);
    expect(activity.dates[0]).toMatchObject({
      startsAt: '2026-09-26T21:00:00.000Z', // Sun 27 Sep, 10am NZDT
      endsAt: '2026-09-27T04:00:00.000Z', // 5pm
    });
  });

  it.each([
    [
      'weekday programmes',
      [
        '28th September 2026 - 9th October 2026',
        'Monday to Friday, 9.00am - 4.30pm',
      ],
      'event',
      10,
      ['2026-09-27T20:00:00.000Z', '2026-09-28T03:30:00.000Z'],
    ],
    [
      'after-hours openings',
      ['30th September 2026', '28th October 2026', 'Open until 8.30pm'],
      'event',
      1,
      ['2026-09-30T04:00:00.000Z', '2026-09-30T07:30:00.000Z'],
    ],
    [
      'permanent exhibitions',
      ['Open daily 10am to 5pm'],
      'exhibition',
      21,
      ['2026-09-26T21:00:00.000Z', '2026-09-27T04:00:00.000Z'],
    ],
    [
      'a single "onwards" date',
      ['31st October 2026 onwards', '8pm–11.30pm'],
      'event',
      0,
      null,
    ],
  ] as const)('reads the schedule of %s', (_, when, kind, count, first) => {
    const dates = parseMuseumSchedule([...when], kind, WINDOW, NOW);
    expect(dates).toHaveLength(count);
    if (first) {
      expect([dates[0].startsAt, dates[0].endsAt]).toEqual(first);
    }
  });

  it('skips Christmas Day for exhibitions following opening hours', () => {
    const december = new Date('2026-12-20T00:00:00.000Z').getTime();
    const dates = parseMuseumSchedule(
      ['Open daily 10am to 5pm'],
      'exhibition',
      getImportWindow(december),
      december,
    );
    expect(dates.map((date) => date.startsAt)).not.toContain(
      '2026-12-24T21:00:00.000Z',
    );
    expect(dates).toHaveLength(20);
  });

  it('reads both listings and keeps pages with sessions in the window', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation((input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : input.toString();
        if (url.endsWith('/whats-on/events')) {
          return Promise.resolve(new Response(EVENTS_HTML));
        }
        if (url.endsWith('/whats-on/exhibitions')) {
          return Promise.resolve(new Response(EXHIBITIONS_HTML));
        }
        return Promise.resolve(
          new Response(
            url.includes('fossil-finds')
              ? pageHtml('17th April 2026 - 7th February 2027<br />10am - 5pm')
              : pageHtml('7th November 2026<br />2pm'),
          ),
        );
      });

    const records = await new WaikatoMuseumAdapter().fetch(source());

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(records.map((record) => record.externalId)).toEqual([
      'exhibition/fossil-finds',
    ]);
  });
});

function source(): Source {
  return {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Waikato Museum',
    sourceType: SourceType.WaikatoMuseum,
    feedUrl: FEED_URL,
    enabled: true,
    scheduleHours: 24,
    lastRunAt: null,
  } as Source;
}

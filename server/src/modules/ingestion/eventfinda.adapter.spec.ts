import { ConfigService } from '@nestjs/config';
import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { Source } from './entities/source.entity';
import { EventfindaAdapter, inferCategory } from './eventfinda.adapter';
import { SourceType } from './source-type.enum';

describe('EventfindaAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches Hamilton events and maps sessions in Auckland time', async () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-09-20T00:00:00.000Z').getTime());
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          '@attributes': { count: 1 },
          events: [
            {
              id: 123,
              url: 'https://www.eventfinda.co.nz/2026/example/hamilton',
              name: 'Hamilton Example',
              description: 'A local event',
              is_free: false,
              is_cancelled: false,
              timezone: 'Pacific/Auckland',
              address: '1 Victoria Street, Hamilton',
              location: {
                id: 10,
                name: 'Example Venue',
                point: { lat: -37.7879, lng: 175.315 },
              },
              category: { id: 20, name: 'Markets and Fairs' },
              sessions: {
                '@attributes': { count: 6 },
                sessions: [
                  {
                    id: 0,
                    timezone: 'Pacific/Auckland',
                    datetime_start: '2025-09-06 14:00:00',
                    datetime_end: '2025-09-06 16:00:00',
                    is_cancelled: false,
                  },
                  {
                    id: 1,
                    timezone: 'Pacific/Auckland',
                    datetime_start: '2026-09-20 14:00:00',
                    datetime_end: '2026-09-20 16:00:00',
                    is_cancelled: false,
                  },
                  {
                    id: 2,
                    timezone: 'Pacific/Auckland',
                    datetime_start: '2026-10-01 14:00:00',
                    datetime_end: '2026-10-01 16:00:00',
                    is_cancelled: false,
                  },
                  {
                    id: 3,
                    timezone: 'Pacific/Auckland',
                    datetime_start: '2026-10-02 14:00:00',
                    datetime_end: '2026-10-02 16:00:00',
                    is_cancelled: true,
                  },
                  {
                    id: 4,
                    timezone: 'Pacific/Auckland',
                    datetime_start: '2026-10-01 14:00:00',
                    datetime_end: '2026-10-01 16:00:00',
                    is_cancelled: false,
                  },
                  {
                    id: 5,
                    timezone: 'Pacific/Auckland',
                    datetime_start: '2026-10-11 14:00:00',
                    datetime_end: '2026-10-11 16:00:00',
                    is_cancelled: false,
                  },
                ],
              },
              images: {
                '@attributes': { count: 1 },
                images: [
                  {
                    is_primary: true,
                    original_url:
                      'https://cdn.eventfinda.co.nz/uploads/example.jpg',
                    transforms: {
                      '@attributes': { count: 2 },
                      transforms: [
                        {
                          url: 'https://cdn.eventfinda.co.nz/uploads/example-650.jpg',
                          width: 650,
                        },
                        {
                          url: 'https://cdn.eventfinda.co.nz/uploads/example-1170.jpg',
                          width: 1170,
                        },
                      ],
                    },
                  },
                ],
              },
              ticket_types: {
                '@attributes': { count: 2 },
                ticket_types: [{ price: '35.00' }, { price: '12.50' }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const adapter = new EventfindaAdapter(
      configService({
        EVENTFINDA_USERNAME: 'test-user',
        EVENTFINDA_PASSWORD: 'test-password',
      }),
    );

    const rawEvents = await adapter.fetch(source());
    const activity = adapter.parse(rawEvents[0]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestOptions] = fetchMock.mock.calls[0];
    expect(requestUrl).toBeInstanceOf(URL);
    const calledUrl = requestUrl as URL;
    const headers = requestOptions?.headers as Record<string, string>;
    expect(calledUrl.searchParams.get('location_slug')).toBe('hamilton');
    expect(calledUrl.searchParams.get('rows')).toBe('20');
    expect(calledUrl.searchParams.get('start_date')).toBe('2026-09-20');
    expect(calledUrl.searchParams.get('end_date')).toBe('2026-10-10');
    expect(headers.Authorization).toMatch(/^Basic /);
    expect(activity).toEqual(
      expect.objectContaining({
        externalId: '123',
        title: 'Hamilton Example',
        costType: ActivityCostType.Paid,
        costAmountFrom: 12.5,
        imageUrl: 'https://cdn.eventfinda.co.nz/uploads/example-650.jpg',
        isCancelled: false,
      }),
    );
    expect(activity.dates).toEqual([
      expect.objectContaining({
        startsAt: '2026-09-20T02:00:00.000Z',
        endsAt: '2026-09-20T04:00:00.000Z',
      }),
      expect.objectContaining({
        startsAt: '2026-10-01T01:00:00.000Z',
        endsAt: '2026-10-01T03:00:00.000Z',
      }),
    ]);
    expect(activity.venue).toEqual(
      expect.objectContaining({
        latitude: -37.7879,
        longitude: 175.315,
      }),
    );
  });

  it('does not save a same-name city coordinate outside the Hamilton region', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-09-20T00:00:00.000Z').getTime());
    const adapter = new EventfindaAdapter(configService({}));
    const activity = adapter.parse({
      id: 456,
      name: 'Hamilton City Centre Event',
      description: 'Local listing with an incorrect overseas coordinate',
      datetime_start: '2026-09-22 12:00:00',
      datetime_end: '2026-09-22 13:00:00',
      timezone: 'Pacific/Auckland',
      is_cancelled: false,
      location: {
        id: 11,
        name: 'Hamilton City Centre',
        point: { lat: 43.2589, lng: -79.8689 },
      },
    });

    expect(activity.venue).toEqual(
      expect.objectContaining({ latitude: null, longitude: null }),
    );
  });

  it('requires credentials before making a request', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const adapter = new EventfindaAdapter(configService({}));

    await expect(adapter.fetch(source())).rejects.toThrow(
      'Eventfinda credentials are not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function configService(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as ConfigService;
}

function source(): Source {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Eventfinda Hamilton',
    sourceType: SourceType.Eventfinda,
    feedUrl: 'https://api.eventfinda.co.nz/v2/events.json',
    enabled: true,
    scheduleHours: 48,
    lastRunAt: null,
  } as Source;
}

describe('inferCategory', () => {
  it.each([
    ['Hamilton Night Market', 'Food & Drink', ActivityCategory.Market],
    ['Pottery for beginners', 'Workshops & Classes', ActivityCategory.Workshop],
    ['Storytime', 'Kids & Family', ActivityCategory.Family],
    ['Riverside Parkrun', 'Sports & Outdoors', ActivityCategory.Outdoors],
    ['Friday Jazz', 'Concerts & Gig Guide', ActivityCategory.ArtsMusic],
    ['Volunteer meetup', null, ActivityCategory.Community],
  ])('maps "%s" (%s) to %s', (title, sourceCategory, expected) => {
    expect(inferCategory(title, sourceCategory)).toBe(expected);
  });
});

import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { ActivityEnvironment } from '../activities/enums/activity-environment.enum';
import { ActivityScheduleMode } from '../activities/enums/activity-schedule-mode.enum';
import { DurationSource } from '../activities/enums/duration-source.enum';
import { ActivityStatus } from '../activities/enums/activity-status.enum';
import {
  DiscoveryService,
  estimateTravel,
  haversineKm,
  intentWindow,
  RecommendationCandidate,
  searchWindow,
} from './discovery.service';
import {
  DiscoveryIntentDto,
  DiscoverySearchScope,
  TravelMode,
} from './dto/discovery.dto';

describe('discovery planning rules', () => {
  it('creates an Auckland-time window across daylight-saving dates', () => {
    const intent = baseIntent({
      date: '2026-09-27',
      availableFrom: '09:00',
      availableTo: '17:00',
    });

    const window = intentWindow(intent);

    expect(window.from.toISOString()).toBe('2026-09-26T20:00:00.000Z');
    expect(window.to.toISOString()).toBe('2026-09-27T04:00:00.000Z');
  });

  it('rejects a window whose end is not later than its start', () => {
    expect(() =>
      intentWindow(
        baseIntent({ availableFrom: '17:00', availableTo: '12:00' }),
      ),
    ).toThrow('availableFrom must be before availableTo');
  });

  it('limits weekend scope to Saturday and Sunday in Auckland time', () => {
    const window = searchWindow(
      baseIntent({ date: '2026-08-10' }),
      DiscoverySearchScope.Weekend,
    );

    expect(window.from.toISOString()).toBe('2026-08-14T12:00:00.000Z');
    expect(window.to.toISOString()).toBe('2026-08-16T12:00:00.000Z');
  });

  it('calculates Hamilton distances and applies travel assumptions', () => {
    const km = haversineKm(-37.7909, 175.2845, -37.7969, 175.2471);
    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(4);

    const driving = estimateTravel(
      candidate('a', -37.7909, 175.2845),
      candidate('b', -37.7969, 175.2471),
      TravelMode.Driving,
    );
    const walking = estimateTravel(
      candidate('a', -37.7909, 175.2845),
      candidate('b', -37.7969, 175.2471),
      TravelMode.Walking,
    );

    expect(driving).toBeGreaterThan(0);
    expect(walking!).toBeGreaterThan(driving!);
  });

  it('allows zero travel at one venue and rejects missing coordinates', () => {
    expect(
      estimateTravel(
        candidate('same', null, null),
        candidate('same', null, null),
        TravelMode.Driving,
      ),
    ).toBe(0);
    expect(
      estimateTravel(
        candidate('a', null, null),
        candidate('b', -37.79, 175.28),
        TravelMode.Driving,
      ),
    ).toBeNull();
  });

  it('filters required conditions, ranks preferences and explains the result', async () => {
    const service = serviceWithDates([
      activityDate(
        'craft',
        '2026-09-19T00:00:00.000Z',
        '2026-09-19T01:00:00.000Z',
        {
          tags: ['family', 'crafts'],
          suburb: 'Hamilton Central',
          costType: ActivityCostType.Free,
        },
      ),
      activityDate(
        'outdoor',
        '2026-09-19T02:00:00.000Z',
        '2026-09-19T03:00:00.000Z',
        {
          tags: ['family', 'science'],
          environment: ActivityEnvironment.Outdoor,
        },
      ),
      activityDate(
        'mixed',
        '2026-09-19T02:30:00.000Z',
        '2026-09-19T03:30:00.000Z',
        {
          tags: ['family', 'crafts'],
          environment: ActivityEnvironment.Mixed,
        },
      ),
      activityDate(
        'adult',
        '2026-09-19T03:00:00.000Z',
        '2026-09-19T04:00:00.000Z',
        {
          tags: ['science'],
        },
      ),
    ]);
    const intent = baseIntent({
      required: {
        familyFriendly: true,
        environment: ActivityEnvironment.Indoor,
      },
      preferred: {
        free: true,
        interests: ['crafts'],
        suburb: 'Hamilton Central',
      },
    });

    const result = await service.recommendations(intent);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].activity.slug).toBe('craft');
    expect(result.items[0].score).toBe(100);
    expect(result.items[0].reasons.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['INTEREST_MATCH', 'FREE', 'PREFERRED_SUBURB']),
    );
  });

  it('uses interests as a generic topic search across titles and tags', async () => {
    const service = serviceWithDates([
      activityDate(
        'art-studio',
        '2026-09-19T00:00:00.000Z',
        '2026-09-19T01:00:00.000Z',
        { tags: ['creative'] },
      ),
      activityDate(
        'food-class',
        '2026-09-19T02:00:00.000Z',
        '2026-09-19T03:00:00.000Z',
        { tags: ['food-gourmet-wine'] },
      ),
      activityDate(
        'sports-session',
        '2026-09-19T04:00:00.000Z',
        '2026-09-19T05:00:00.000Z',
        { tags: ['outdoors'] },
      ),
    ]);

    const arts = await service.recommendations(
      baseIntent({ preferred: { interests: ['arts'] } }),
    );
    const food = await service.recommendations(
      baseIntent({ preferred: { interests: ['food'] } }),
    );

    expect(arts.items.map(({ activity }) => activity.slug)).toEqual([
      'art-studio',
    ]);
    expect(food.items.map(({ activity }) => activity.slug)).toEqual([
      'food-class',
    ]);
    expect(arts.items[0].matchedInterests).toEqual(['arts']);
    expect(food.items[0].matchedInterests).toEqual(['food']);
  });

  it('offers an explicit broad search when no topic matches', async () => {
    const service = serviceWithDates([
      activityDate(
        'community-event',
        '2026-09-19T00:00:00.000Z',
        '2026-09-19T01:00:00.000Z',
        { tags: ['community'] },
      ),
    ]);

    const result = await service.recommendations(
      baseIntent({ preferred: { interests: ['astronomy'] } }),
    );

    expect(result.items).toHaveLength(0);
    expect(result.relaxationSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ANY_TOPIC',
          label: 'Show all topics',
          count: 1,
        }),
      ]),
    );
  });

  it('builds a compatible plan instead of choosing overlapping top results', async () => {
    const service = serviceWithDates([
      activityDate(
        'craft',
        '2026-09-19T00:00:00.000Z',
        '2026-09-19T01:00:00.000Z',
        {
          tags: ['family', 'crafts'],
          suburb: 'Hamilton Central',
          latitude: -37.7909,
          longitude: 175.2845,
        },
      ),
      activityDate(
        'overlap',
        '2026-09-19T00:30:00.000Z',
        '2026-09-19T01:30:00.000Z',
        {
          tags: ['family', 'science'],
          suburb: 'Hamilton Central',
          latitude: -37.7909,
          longitude: 175.2845,
        },
      ),
      activityDate(
        'later',
        '2026-09-19T02:15:00.000Z',
        '2026-09-19T03:15:00.000Z',
        {
          tags: ['family', 'science'],
          suburb: 'Dinsdale',
          latitude: -37.7969,
          longitude: 175.2471,
        },
      ),
    ]);
    const intent = baseIntent({
      required: {
        familyFriendly: true,
        environment: ActivityEnvironment.Indoor,
      },
      preferred: {
        free: true,
        interests: ['crafts', 'science'],
        suburb: 'Hamilton Central',
      },
    });

    const plan = await service.itinerary({
      intent,
      targetCount: 2,
      lockedActivityDateIds: [],
      excludedActivityDateIds: [],
    });

    expect(plan.status).toBe('complete');
    expect(
      (plan.activities as RecommendationCandidate[]).map(
        (item) => item.activity.slug,
      ),
    ).toEqual(['craft', 'later']);
  });

  it('schedules a window activity for its visit duration instead of its opening hours', async () => {
    const service = serviceWithDates([
      activityDate(
        'gallery',
        '2026-09-18T21:00:00.000Z',
        '2026-09-19T05:00:00.000Z',
        {
          scheduleMode: ActivityScheduleMode.Window,
          visitMinutes: 60,
          durationSource: DurationSource.CategoryDefault,
        },
      ),
      activityDate(
        'talk',
        '2026-09-19T02:00:00.000Z',
        '2026-09-19T03:00:00.000Z',
      ),
    ]);

    const plan = await service.itinerary({
      intent: baseIntent({ availableFrom: '12:00', availableTo: '17:00' }),
      targetCount: 2,
      lockedActivityDateIds: [],
      excludedActivityDateIds: [],
    });
    const activities = plan.activities as RecommendationCandidate[];

    expect(plan.status).toBe('complete');
    expect(activities[0].activity.slug).toBe('gallery');
    expect(activities[0].date.endsAt).toBe('2026-09-19T01:00:00.000Z');
    expect(
      (
        activities[0].date as RecommendationCandidate['date'] & {
          durationEstimated: boolean;
        }
      ).durationEstimated,
    ).toBe(true);
  });

  it('exports the planned slot as an iCalendar event', async () => {
    const service = serviceWithDates([
      activityDate(
        'gallery',
        '2026-09-18T21:00:00.000Z',
        '2026-09-19T05:00:00.000Z',
        {
          scheduleMode: ActivityScheduleMode.Window,
          visitMinutes: 60,
          durationSource: DurationSource.Manual,
        },
      ),
    ]);
    const calendar = await service.calendar({
      intent: baseIntent({ availableFrom: '12:00', availableTo: '17:00' }),
      targetCount: 2,
      lockedActivityDateIds: [],
      excludedActivityDateIds: [],
    });

    expect(calendar).toContain('BEGIN:VCALENDAR\r\n');
    expect(calendar).toContain('DTSTART:20260919T000000Z');
    expect(calendar).toContain('DTEND:20260919T010000Z');
    expect(calendar).toContain('SUMMARY:gallery');
  });
});

function baseIntent(changes: Partial<DiscoveryIntentDto>): DiscoveryIntentDto {
  return {
    date: '2026-09-19',
    availableFrom: '12:00',
    availableTo: '17:00',
    timezone: 'Pacific/Auckland',
    required: {},
    preferred: { interests: [] },
    targetActivityCount: 2,
    travelMode: TravelMode.Driving,
    ...changes,
  };
}

function candidate(
  venueId: string,
  latitude: number | null,
  longitude: number | null,
): RecommendationCandidate {
  return {
    activity: {
      id: crypto.randomUUID(),
      title: 'Test activity',
      slug: crypto.randomUUID(),
      summary: null,
      description: 'Test',
      imageUrl: null,
      environment: ActivityEnvironment.Indoor,
      scheduleMode: ActivityScheduleMode.Fixed,
      visitMinutes: null,
      durationSource: DurationSource.Source,
      costType: ActivityCostType.Free,
      costAmountFrom: null,
      currency: 'NZD',
      costDetails: null,
      venue: {
        id: venueId,
        name: 'Venue',
        address: null,
        suburb: null,
        city: 'Hamilton',
        latitude,
        longitude,
      },
      sourceUrl: null,
      status: ActivityStatus.Published,
      publishedAt: null,
      cancelledAt: null,
      dates: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    date: {
      id: crypto.randomUUID(),
      startsAt: '2026-09-19T00:00:00.000Z',
      endsAt: '2026-09-19T01:00:00.000Z',
      timezone: 'Pacific/Auckland',
      isAllDay: false,
    },
    score: 0,
    reasons: [],
    unmetPreferences: [],
    matchedInterests: [],
  };
}

function serviceWithDates(dates: unknown[]): DiscoveryService {
  const query = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(dates),
  };
  return new DiscoveryService(
    { createQueryBuilder: jest.fn(() => query) } as never,
    { get: jest.fn() } as never,
  );
}

function activityDate(
  slugValue: string,
  startsAt: string,
  endsAt: string,
  options: {
    tags?: string[];
    suburb?: string;
    latitude?: number;
    longitude?: number;
    environment?: ActivityEnvironment;
    costType?: ActivityCostType;
    scheduleMode?: ActivityScheduleMode;
    visitMinutes?: number;
    durationSource?: DurationSource;
  } = {},
) {
  const activityId = crypto.randomUUID();
  const venueId = crypto.randomUUID();
  const dateId = crypto.randomUUID();
  const date = {
    id: dateId,
    activityId,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    timezone: 'Pacific/Auckland',
    isAllDay: false,
    recurrenceRule: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    activity: {
      id: activityId,
      title: slugValue,
      slug: slugValue,
      summary: null,
      description: 'Test activity',
      imageUrl: null,
      environment: options.environment ?? ActivityEnvironment.Indoor,
      scheduleMode: options.scheduleMode ?? ActivityScheduleMode.Fixed,
      visitMinutes: options.visitMinutes ?? null,
      durationSource: options.durationSource ?? DurationSource.Source,
      costType: options.costType ?? ActivityCostType.Free,
      costAmountFrom: null,
      currency: 'NZD',
      costDetails: null,
      venueId,
      venue: {
        id: venueId,
        name: `${slugValue} venue`,
        address: null,
        suburb: options.suburb ?? 'Dinsdale',
        city: 'Hamilton',
        latitude: options.latitude ?? -37.7969,
        longitude: options.longitude ?? 175.2471,
        activities: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      sourceUrl: null,
      sourceId: null,
      source: null,
      externalId: null,
      importFingerprint: null,
      status: ActivityStatus.Published,
      publishedAt: new Date(),
      cancelledAt: null,
      dates: [] as unknown[],
      activityTags: (options.tags ?? []).map((tag) => ({
        activityId,
        tagId: crypto.randomUUID(),
        activity: null,
        tag: {
          id: crypto.randomUUID(),
          name: tag,
          slug: tag,
          activityTags: [],
        },
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
  date.activity.dates = [date];
  return date;
}

import dataSource from '../data-source';
import { ActivityDate } from '../../modules/activities/entities/activity-date.entity';
import { ActivityTag } from '../../modules/activities/entities/activity-tag.entity';
import { Activity } from '../../modules/activities/entities/activity.entity';
import { Tag } from '../../modules/activities/entities/tag.entity';
import { Venue } from '../../modules/activities/entities/venue.entity';
import { ActivityCostType } from '../../modules/activities/enums/activity-cost-type.enum';
import { ActivityStatus } from '../../modules/activities/enums/activity-status.enum';

const TIMEZONE = 'Pacific/Auckland';

interface SeedActivity {
  title: string;
  slug: string;
  summary: string;
  description: string;
  costType: ActivityCostType;
  costAmountFrom?: string;
  costDetails?: string;
  imageUrl?: string;
  venue: string;
  tags: string[];
  dayOffset: number;
  startsAt: [number, number];
  durationMinutes: number;
}

const venues = [
  {
    name: 'Dinsdale Community Hall',
    address: '62 Whatawhata Road',
    suburb: 'Dinsdale',
  },
  {
    name: 'Waikato Museum',
    address: '1 Grantham Street',
    suburb: 'Hamilton Central',
  },
  {
    name: 'Hamilton Gardens',
    address: 'Hungerford Crescent',
    suburb: 'Hamilton East',
  },
  {
    name: 'The Meteor',
    address: '1 Victoria Street',
    suburb: 'Hamilton Central',
  },
  {
    name: 'Hamilton Lake Domain',
    address: 'Ruakiwi Road',
    suburb: 'Hamilton Lake',
  },
];

const tags = [
  { name: 'Family', slug: 'family' },
  { name: 'Students', slug: 'students' },
  { name: 'Community', slug: 'community' },
  { name: 'Arts', slug: 'arts' },
  { name: 'Outdoors', slug: 'outdoors' },
];

const activities: SeedActivity[] = [
  {
    title: 'Community Repair Café',
    slug: 'dev-community-repair-cafe',
    summary:
      'Bring broken household items and learn how to repair them with local volunteers.',
    description:
      'A practical community repair session for small appliances, clothing and bicycles.',
    costType: ActivityCostType.Free,
    imageUrl: '/images/activities/event-triptych.png',
    venue: 'Dinsdale Community Hall',
    tags: ['community'],
    dayOffset: 1,
    startsAt: [18, 0],
    durationMinutes: 120,
  },
  {
    title: 'Student Film Night',
    slug: 'dev-student-film-night',
    summary: 'A relaxed evening of short films selected by Waikato students.',
    description:
      'Local and international short films followed by an informal audience discussion.',
    costType: ActivityCostType.Paid,
    costAmountFrom: '8.00',
    costDetails: 'Student ID price',
    venue: 'The Meteor',
    tags: ['students', 'arts'],
    dayOffset: 2,
    startsAt: [19, 0],
    durationMinutes: 150,
  },
  {
    title: 'After-school Art Lab',
    slug: 'dev-after-school-art-lab',
    summary:
      'Hands-on drawing and collage activities for school-age children and their families.',
    description:
      'A guided creative workshop using materials supplied by the museum.',
    costType: ActivityCostType.Free,
    imageUrl: '/images/activities/event-triptych.png',
    venue: 'Waikato Museum',
    tags: ['family', 'arts'],
    dayOffset: 3,
    startsAt: [15, 30],
    durationMinutes: 90,
  },
  {
    title: 'Friday Live Music Session',
    slug: 'dev-friday-live-music-session',
    summary:
      'An early evening showcase featuring musicians from around the Waikato.',
    description:
      'A casual live music session with a rotating line-up of local performers.',
    costType: ActivityCostType.Paid,
    imageUrl: '/images/activities/event-triptych.png',
    costAmountFrom: '15.00',
    venue: 'The Meteor',
    tags: ['arts', 'community'],
    dayOffset: 4,
    startsAt: [18, 30],
    durationMinutes: 150,
  },
  {
    title: 'Hamilton Gardens Family Trail',
    slug: 'dev-hamilton-gardens-family-trail',
    summary: 'Follow a self-guided discovery trail through the themed gardens.',
    description:
      'Collect a trail sheet and explore family-friendly clues throughout the gardens.',
    costType: ActivityCostType.Free,
    venue: 'Hamilton Gardens',
    tags: ['family', 'outdoors'],
    dayOffset: 5,
    startsAt: [10, 0],
    durationMinutes: 120,
  },
  {
    title: 'Sunday Lake Walk',
    slug: 'dev-sunday-lake-walk',
    summary: 'A friendly community walk around Hamilton Lake at an easy pace.',
    description:
      'Meet other locals for a social walk suitable for a range of fitness levels.',
    costType: ActivityCostType.Free,
    venue: 'Hamilton Lake Domain',
    tags: ['community', 'outdoors'],
    dayOffset: 6,
    startsAt: [9, 0],
    durationMinutes: 75,
  },
  {
    title: 'Next Week: Museum Sketch Club',
    slug: 'dev-next-week-museum-sketch-club',
    summary:
      'A social sketching session inspired by objects in the museum collection.',
    description:
      'Bring a sketchbook or use the basic drawing materials provided.',
    costType: ActivityCostType.Free,
    venue: 'Waikato Museum',
    tags: ['arts', 'students'],
    dayOffset: 8,
    startsAt: [17, 30],
    durationMinutes: 90,
  },
  {
    title: 'Next Week: Garden Photography Walk',
    slug: 'dev-next-week-garden-photography-walk',
    summary:
      'Practise outdoor photography with guidance from a local enthusiast.',
    description: 'A relaxed photo walk suitable for phones and cameras.',
    costType: ActivityCostType.Paid,
    costAmountFrom: '12.00',
    venue: 'Hamilton Gardens',
    tags: ['arts', 'outdoors'],
    dayOffset: 10,
    startsAt: [10, 0],
    durationMinutes: 120,
  },
  {
    title: 'Next Week: Community Games Evening',
    slug: 'dev-next-week-community-games-evening',
    summary:
      'Board games and light refreshments for neighbours, students and families.',
    description:
      'Drop in for modern board games with volunteer hosts available to teach the rules.',
    costType: ActivityCostType.Free,
    venue: 'Dinsdale Community Hall',
    tags: ['community', 'family', 'students'],
    dayOffset: 12,
    startsAt: [18, 0],
    durationMinutes: 180,
  },
];

async function seed(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      const venueRepository = manager.getRepository(Venue);
      const tagRepository = manager.getRepository(Tag);
      const activityRepository = manager.getRepository(Activity);
      const dateRepository = manager.getRepository(ActivityDate);
      const activityTagRepository = manager.getRepository(ActivityTag);
      const venueByName = new Map<string, Venue>();
      const tagBySlug = new Map<string, Tag>();

      for (const input of venues) {
        let venue = await venueRepository.findOneBy({ name: input.name });
        venue ??= venueRepository.create({
          ...input,
          city: 'Hamilton',
          latitude: null,
          longitude: null,
        });
        Object.assign(venue, input);
        venueByName.set(input.name, await venueRepository.save(venue));
      }

      for (const input of tags) {
        let tag = await tagRepository.findOneBy({ slug: input.slug });
        tag ??= tagRepository.create(input);
        Object.assign(tag, input);
        tagBySlug.set(input.slug, await tagRepository.save(tag));
      }

      for (const input of activities) {
        let activity = await activityRepository.findOneBy({ slug: input.slug });
        activity ??= activityRepository.create({ slug: input.slug });
        Object.assign(activity, {
          title: input.title,
          summary: input.summary,
          description: input.description,
          imageUrl: input.imageUrl ?? null,
          costType: input.costType,
          costAmountFrom: input.costAmountFrom ?? null,
          currency: 'NZD',
          costDetails: input.costDetails ?? null,
          venueId: venueByName.get(input.venue)?.id ?? null,
          sourceUrl: null,
          status: ActivityStatus.Published,
          publishedAt: activity.publishedAt ?? new Date(),
          cancelledAt: null,
        });
        activity = await activityRepository.save(activity);

        const startsAt = getWeekDate(input.dayOffset, ...input.startsAt);
        const endsAt = new Date(
          startsAt.getTime() + input.durationMinutes * 60 * 1000,
        );
        await dateRepository.delete({ activityId: activity.id });
        await dateRepository.save(
          dateRepository.create({
            activityId: activity.id,
            startsAt,
            endsAt,
            timezone: TIMEZONE,
            isAllDay: false,
            recurrenceRule: null,
          }),
        );

        await activityTagRepository.delete({ activityId: activity.id });
        await activityTagRepository.save(
          input.tags.map((slug) =>
            activityTagRepository.create({
              activityId: activity.id,
              tagId: tagBySlug.get(slug)?.id,
            }),
          ),
        );
      }
    });

    console.log(`Seeded ${activities.length} development activities.`);
  } finally {
    await dataSource.destroy();
  }
}

function getWeekDate(dayOffset: number, hour: number, minute: number): Date {
  const today = getDateParts(new Date());
  const mondayUtc = Date.UTC(
    today.year,
    today.month - 1,
    today.day - today.dayOfWeek + 1,
  );
  const target = new Date(mondayUtc + dayOffset * 24 * 60 * 60 * 1000);

  return fromZonedTime(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    target.getUTCDate(),
    hour,
    minute,
  );
}

function getDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const weekdays: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    dayOfWeek: weekdays[values.weekday] ?? 1,
  };
}

function fromZonedTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let result = new Date(localAsUtc);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    result = new Date(localAsUtc - getTimezoneOffset(result));
  }

  return result;
}

function getTimezoneOffset(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const zonedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return zonedAsUtc - date.getTime();
}

void seed();

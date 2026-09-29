import dataSource from '../data-source';
import { ActivityDate } from '../../modules/activities/entities/activity-date.entity';
import { ActivityTag } from '../../modules/activities/entities/activity-tag.entity';
import { Activity } from '../../modules/activities/entities/activity.entity';
import { Tag } from '../../modules/activities/entities/tag.entity';
import { Venue } from '../../modules/activities/entities/venue.entity';
import { ActivityCategory } from '../../modules/activities/enums/activity-category.enum';
import { ActivityCostType } from '../../modules/activities/enums/activity-cost-type.enum';
import { ActivityEnvironment } from '../../modules/activities/enums/activity-environment.enum';
import { ActivityStatus } from '../../modules/activities/enums/activity-status.enum';
import { DurationSource } from '../../modules/activities/enums/duration-source.enum';

/**
 * Weekly activities for the "Regular" tab, aimed at international students
 * learning and practising English. Activities are created as drafts so an
 * editor can review them; existing slugs are left untouched.
 */

type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

interface Slot {
  days: Weekday[];
  /** Date of the first session, in Pacific/Auckland (NZDT, +13:00). */
  firstDate: string;
  start: string;
  end?: string;
  until?: string;
}

interface RegularActivity {
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: ActivityCategory;
  environment: ActivityEnvironment;
  costType: ActivityCostType;
  costAmountFrom?: string;
  costDetails?: string;
  sourceUrl?: string;
  venue?: string;
  tags: string[];
  slots: Slot[];
}

const TERM_4_END = '20261218';

const venues = [
  {
    name: 'University of Waikato',
    address: 'Knighton Road',
    suburb: 'Hillcrest',
  },
  {
    name: 'Central Library, Hamilton',
    address: 'Garden Place',
    suburb: 'Hamilton Central',
  },
  { name: 'Whitiora Bible Church', address: '24 Abbotsford Street' },
  { name: 'Shama Hamilton', address: '8 Liverpool Street' },
  {
    name: 'Shama Cooking & Conversation',
    address: '27 Beatty Street',
    suburb: 'Melville',
  },
  { name: 'Agora Church', address: null },
  {
    name: "St Alban's Church, Chartwell",
    address: '126 Comries Road',
    suburb: 'Chartwell',
  },
];

const tags = [
  { name: 'English', slug: 'english' },
  { name: 'Public speaking', slug: 'public-speaking' },
];

const termNote = ' Runs during school terms only; check before you go.';

const activities: RegularActivity[] = [
  {
    title: "English Learners' Corner",
    slug: 'regular-english-learners-corner',
    summary: 'Free weekly chat for English learners at the Central Library.',
    description:
      'A friendly group for ESL learners to practise speaking, build confidence and make friends. For your first visit you can text Peter on 027 777 2628. Scheduled through 7 December.',
    category: ActivityCategory.Community,
    environment: ActivityEnvironment.Indoor,
    costType: ActivityCostType.Free,
    venue: 'Central Library, Hamilton',
    tags: ['english'],
    slots: [
      {
        days: ['MO'],
        firstDate: '2026-09-28',
        start: '10:00',
        end: '11:30',
        until: '20261207',
      },
    ],
  },
  {
    title: 'Hamilton Central Essential Toastmasters',
    slug: 'regular-hamilton-central-toastmasters',
    summary:
      'Public speaking and impromptu talks with feedback, new English speakers welcome.',
    description:
      'A Toastmasters club meeting at the Central Library. Practise prepared and impromptu speaking and get feedback, which helps with interviews and networking. New English speakers are welcome.',
    category: ActivityCategory.Community,
    environment: ActivityEnvironment.Indoor,
    costType: ActivityCostType.Free,
    venue: 'Central Library, Hamilton',
    tags: ['public-speaking', 'english'],
    slots: [
      { days: ['SA'], firstDate: '2026-10-03', start: '09:50', end: '11:30' },
    ],
  },
  {
    title: 'Toastmasters Hamilton Club',
    slug: 'regular-toastmasters-hamilton-club',
    summary: 'Evening public speaking practice at Chartwell, guests welcome.',
    description:
      'The Toastmasters Hamilton Club (Club 1893) meets almost every Monday, excluding public holidays. Guests are welcome to visit a meeting and see how the club works. Check the club calendar at hamilton.toastmastersclubs.org to confirm meeting dates.',
    category: ActivityCategory.Community,
    environment: ActivityEnvironment.Indoor,
    costType: ActivityCostType.Unknown,
    sourceUrl: 'https://hamilton.toastmastersclubs.org/directions/',
    venue: "St Alban's Church, Chartwell",
    tags: ['public-speaking'],
    slots: [
      { days: ['MO'], firstDate: '2026-09-28', start: '19:00', end: '21:00' },
    ],
  },
  {
    title: 'ISMNZ English Conversation',
    slug: 'regular-ismnz-english-conversation',
    summary: 'A lunchtime English corner for international students on campus.',
    description:
      'A drop-in English conversation group run by International Student Ministries at the Lady Goodfellow Chapel Drop-in Centre, University of Waikato. No cost is listed; ask when you arrive.',
    category: ActivityCategory.Community,
    environment: ActivityEnvironment.Indoor,
    costType: ActivityCostType.Unknown,
    venue: 'University of Waikato',
    tags: ['english'],
    slots: [
      { days: ['WE'], firstDate: '2026-09-30', start: '12:00', end: '13:00' },
    ],
  },
  {
    title: 'Agora Church Converse',
    slug: 'regular-agora-church-converse',
    summary:
      'Free Conversational English with beginner, intermediate and advanced groups.',
    description:
      'A fixed Conversational English programme with roughly 35 to 45 learners each week from many countries, in levels from beginner to advanced. You do not need to be Christian to take part.' +
      termNote,
    category: ActivityCategory.Community,
    environment: ActivityEnvironment.Indoor,
    costType: ActivityCostType.Free,
    venue: 'Agora Church',
    tags: ['english'],
    slots: [
      {
        days: ['WE'],
        firstDate: '2026-10-14',
        start: '19:00',
        end: '20:30',
        until: TERM_4_END,
      },
    ],
  },
  {
    title: 'Whitiora Conversational English',
    slug: 'regular-whitiora-conversational-english',
    summary: 'A smaller morning conversation class at Whitiora Bible Church.',
    description:
      'Conversational English classes in a small community setting. The cost is not listed; ask before your first visit.' +
      termNote,
    category: ActivityCategory.Community,
    environment: ActivityEnvironment.Indoor,
    costType: ActivityCostType.Unknown,
    venue: 'Whitiora Bible Church',
    tags: ['english'],
    slots: [
      {
        days: ['TH'],
        firstDate: '2026-10-15',
        start: '10:00',
        until: TERM_4_END,
      },
    ],
  },
  {
    title: 'Chartwell English Conversation Group',
    slug: 'regular-chartwell-english-conversation-group',
    summary: 'A large evening conversation group of 40 to 50 people.',
    description:
      'A community conversation group that usually draws 40 to 50 people from over 12 countries. It is relaxed chat about everyday topics, not a classroom.' +
      termNote,
    category: ActivityCategory.Community,
    environment: ActivityEnvironment.Indoor,
    costType: ActivityCostType.Unknown,
    venue: "St Alban's Church, Chartwell",
    tags: ['english'],
    slots: [
      {
        days: ['TU'],
        firstDate: '2026-10-13',
        start: '19:00',
        until: TERM_4_END,
      },
    ],
  },
  {
    title: 'Shama English Classes',
    slug: 'regular-shama-english-classes',
    summary: 'Low-cost English classes for ethnic women.',
    description:
      "For ethnic women only. English classes at Shama, Ethnic Women's Trust: Tuesdays 12:30 to 14:00 and Wednesdays and Thursdays 10:00 to 12:00. Ten sessions cost $5. Phone 07 843 3810 or email info@shama.org.nz.",
    category: ActivityCategory.Community,
    environment: ActivityEnvironment.Indoor,
    costType: ActivityCostType.Paid,
    costAmountFrom: '0.50',
    costDetails: '10 sessions for $5',
    sourceUrl: 'https://shama.org.nz/',
    venue: 'Shama Hamilton',
    tags: ['english'],
    slots: [
      { days: ['TU'], firstDate: '2026-09-29', start: '12:30', end: '14:00' },
      { days: ['WE'], firstDate: '2026-09-30', start: '10:00', end: '12:00' },
      { days: ['TH'], firstDate: '2026-10-01', start: '10:00', end: '12:00' },
    ],
  },
  {
    title: 'Shama Cooking & Conversation',
    slug: 'regular-shama-cooking-and-conversation',
    summary: 'Cook and chat with women from many cultures.',
    description:
      "For ethnic women only. Women of all ages and cultures cook together and practise conversation at Shama, Ethnic Women's Trust. Phone 07 843 3810 or email info@shama.org.nz.",
    category: ActivityCategory.Community,
    environment: ActivityEnvironment.Indoor,
    costType: ActivityCostType.Unknown,
    sourceUrl: 'https://shama.org.nz/',
    venue: 'Shama Cooking & Conversation',
    tags: ['english'],
    slots: [
      { days: ['FR'], firstDate: '2026-10-02', start: '10:00', end: '12:00' },
    ],
  },
];

async function seed(): Promise<void> {
  await dataSource.initialize();

  try {
    let created = 0;
    await dataSource.transaction(async (manager) => {
      const venueRepository = manager.getRepository(Venue);
      const tagRepository = manager.getRepository(Tag);
      const activityRepository = manager.getRepository(Activity);
      const dateRepository = manager.getRepository(ActivityDate);
      const activityTagRepository = manager.getRepository(ActivityTag);
      const venueByName = new Map<string, Venue>();
      const tagBySlug = new Map<string, Tag>();

      for (const input of venues) {
        const venue =
          (await venueRepository.findOneBy({ name: input.name })) ??
          (await venueRepository.save(
            venueRepository.create({
              ...input,
              suburb: input.suburb ?? null,
              city: 'Hamilton',
            }),
          ));
        venueByName.set(input.name, venue);
      }

      for (const input of tags) {
        const tag =
          (await tagRepository.findOneBy({ slug: input.slug })) ??
          (await tagRepository.save(tagRepository.create(input)));
        tagBySlug.set(input.slug, tag);
      }

      for (const input of activities) {
        if (await activityRepository.existsBy({ slug: input.slug })) continue;

        const activity = await activityRepository.save(
          activityRepository.create({
            title: input.title,
            slug: input.slug,
            summary: input.summary,
            description: input.description,
            category: input.category,
            environment: input.environment,
            costType: input.costType,
            costAmountFrom: input.costAmountFrom ?? null,
            currency: 'NZD',
            costDetails: input.costDetails ?? null,
            venueId: venueByName.get(input.venue ?? '')?.id ?? null,
            sourceUrl: input.sourceUrl ?? null,
            durationSource: input.slots.every((slot) => slot.end)
              ? DurationSource.Manual
              : DurationSource.CategoryDefault,
            status: ActivityStatus.Draft,
          }),
        );

        await dateRepository.save(
          input.slots.map((slot) =>
            dateRepository.create({
              activityId: activity.id,
              startsAt: new Date(`${slot.firstDate}T${slot.start}:00+13:00`),
              endsAt: slot.end
                ? new Date(`${slot.firstDate}T${slot.end}:00+13:00`)
                : null,
              timezone: 'Pacific/Auckland',
              isAllDay: false,
              recurrenceRule: [
                'FREQ=WEEKLY',
                `BYDAY=${slot.days.join(',')}`,
                ...(slot.until ? [`UNTIL=${slot.until}`] : []),
              ].join(';'),
            }),
          ),
        );

        await activityTagRepository.save(
          input.tags.map((slug) =>
            activityTagRepository.create({
              activityId: activity.id,
              tagId: tagBySlug.get(slug)?.id,
            }),
          ),
        );
        created += 1;
      }
    });

    console.log(
      `Created ${created} draft regular activities; ${activities.length - created} already existed.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

void seed();

import { ActivityCategory } from '../activities/enums/activity-category.enum';

export interface CategoryInput {
  title: string;
  /** The source's own category names, such as Eventfinda's categories. */
  labels?: string[];
  /** Who the source says the activity is for. */
  audiences?: string[];
  /** Free text to search when no label is recognised. */
  text?: string | null;
}

/**
 * Source category names mapped to ours. Names are matched after trimming and
 * lowercasing. A name mapped to community still counts as known, so a source
 * that calls something a festival is not second-guessed by title keywords; a
 * name missing here falls back to keywords, and the categories:reclassify
 * report lists it so it can be added.
 */
const LABEL_CATEGORIES: Record<string, ActivityCategory> = {
  // Eventfinda
  'arts and crafts': ActivityCategory.ArtsMusic,
  'choir, vocal music': ActivityCategory.ArtsMusic,
  'classical music': ActivityCategory.ArtsMusic,
  comedy: ActivityCategory.ArtsMusic,
  'contemporary art': ActivityCategory.ArtsMusic,
  'covers, tribute bands': ActivityCategory.ArtsMusic,
  'craft & object art': ActivityCategory.ArtsMusic,
  dance: ActivityCategory.ArtsMusic,
  'fine art': ActivityCategory.ArtsMusic,
  jazz: ActivityCategory.ArtsMusic,
  literary: ActivityCategory.ArtsMusic,
  musicals: ActivityCategory.ArtsMusic,
  rock: ActivityCategory.ArtsMusic,
  'singer-songwriter': ActivityCategory.ArtsMusic,
  theatre: ActivityCategory.ArtsMusic,
  'variety concerts': ActivityCategory.ArtsMusic,
  'children, kids, holidays': ActivityCategory.Family,
  'family & lifestyle': ActivityCategory.Family,
  'family entertainment': ActivityCategory.Family,
  'charity, fundraisers': ActivityCategory.Market,
  'markets and fairs': ActivityCategory.Market,
  'dance sport': ActivityCategory.Outdoors,
  equestrian: ActivityCategory.Outdoors,
  fitness: ActivityCategory.Outdoors,
  motorsport: ActivityCategory.Outdoors,
  outdoors: ActivityCategory.Outdoors,
  'rugby union': ActivityCategory.Outdoors,
  tennis: ActivityCategory.Outdoors,
  wrestling: ActivityCategory.Outdoors,
  'business & professional': ActivityCategory.Workshop,
  education: ActivityCategory.Workshop,
  'alumni, associations, clubs': ActivityCategory.Community,
  'bar djs': ActivityCategory.Community,
  'commemorations, ceremonies': ActivityCategory.Community,
  'ethnic, multicultural': ActivityCategory.Community,
  festivals: ActivityCategory.Community,
  'food, gourmet, wine': ActivityCategory.Community,
  'lifestyle shows, expos': ActivityCategory.Community,
  'mind & body': ActivityCategory.Community,
  'natural history': ActivityCategory.Community,
  poker: ActivityCategory.Community,
  'public talks & tours': ActivityCategory.Community,
  'quiz, karaoke': ActivityCategory.Community,
  'socials, singles, balls': ActivityCategory.Community,
  // Hamilton Libraries event types
  'language programmes': ActivityCategory.Workshop,
  technology: ActivityCategory.Workshop,
  'school holidays': ActivityCategory.Family,
  archives: ActivityCategory.Community,
  'community services': ActivityCategory.Community,
  creativity: ActivityCategory.Community,
  heritage: ActivityCategory.Community,
  'life skills': ActivityCategory.Community,
  'literature events': ActivityCategory.Community,
  'recreational events': ActivityCategory.Community,
  'te ao maaori': ActivityCategory.Community,
  // Waikato Museum listing kind
  exhibition: ActivityCategory.ArtsMusic,
};

const MARKET_WORDS = /\b(markets?|fairs?)\b/;
const WORKSHOP_WORDS = /\b(workshops?|class(es)?|courses?|lessons?)\b/;
const EXHIBITION_WORDS = /\bexhibitions?\b/;
const CHILD_AUDIENCE = /\b(children|kids?|preschoolers?|family|families)\b/;

/**
 * The title's own format comes first, then an audience of children, then the
 * source's category, then keywords in the remaining text.
 */
export function inferCategory(input: CategoryInput): ActivityCategory {
  const title = input.title.toLowerCase();
  if (MARKET_WORDS.test(title)) return ActivityCategory.Market;
  if (WORKSHOP_WORDS.test(title)) return ActivityCategory.Workshop;
  if (EXHIBITION_WORDS.test(title)) return ActivityCategory.ArtsMusic;

  if (
    input.audiences?.some((audience) =>
      CHILD_AUDIENCE.test(audience.toLowerCase()),
    )
  ) {
    return ActivityCategory.Family;
  }

  // A specific category wins over a general one, whatever the label order.
  const mapped = (input.labels ?? [])
    .map((label) => LABEL_CATEGORIES[normalizeLabel(label)])
    .filter((category) => category !== undefined);
  if (mapped.length) {
    return (
      mapped.find((category) => category !== ActivityCategory.Community) ??
      ActivityCategory.Community
    );
  }

  return inferFromKeywords(
    [title, ...(input.labels ?? []), input.text ?? ''].join(' ').toLowerCase(),
  );
}

export function isKnownLabel(label: string): boolean {
  return normalizeLabel(label) in LABEL_CATEGORIES;
}

function inferFromKeywords(text: string): ActivityCategory {
  if (MARKET_WORDS.test(text)) return ActivityCategory.Market;
  if (WORKSHOP_WORDS.test(text)) return ActivityCategory.Workshop;
  if (/\b(kids?|family|families|children)\b/.test(text))
    return ActivityCategory.Family;
  if (/\b(outdoors?|sports?|nature|walks?|garden|parks?)\b/.test(text))
    return ActivityCategory.Outdoors;
  if (
    /\b(music|concerts?|gigs?|art|arts|exhibitions?|theatre|film|comedy|dance|performances?)\b/.test(
      text,
    )
  )
    return ActivityCategory.ArtsMusic;
  return ActivityCategory.Community;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

import { ActivityCategory } from '../activities/enums/activity-category.enum';

export function inferCategory(
  title: string,
  sourceCategory: string | null,
): ActivityCategory {
  const text = `${title} ${sourceCategory ?? ''}`.toLowerCase();
  if (/\bmarkets?\b/.test(text)) return ActivityCategory.Market;
  if (/\b(workshops?|class(es)?|courses?|lessons?)\b/.test(text))
    return ActivityCategory.Workshop;
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

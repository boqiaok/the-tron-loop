import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { inferCategory } from './infer-category';

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

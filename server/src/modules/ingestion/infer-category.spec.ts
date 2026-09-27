import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { inferCategory, isKnownLabel } from './infer-category';

describe('inferCategory', () => {
  it.each([
    [
      'Harmony Waikato Rhapsody',
      'Choir, Vocal Music',
      ActivityCategory.ArtsMusic,
    ],
    ['Skimanik Presents: The Interference', 'Rock', ActivityCategory.ArtsMusic],
    ['NZTrio+', 'Jazz', ActivityCategory.ArtsMusic],
    ['The Spongebob Musical', 'Musicals', ActivityCategory.ArtsMusic],
    [
      'The Wiggles Live in Concert',
      'Family Entertainment',
      ActivityCategory.Family,
    ],
    ['Fabric-a-brac', 'Charity, Fundraisers', ActivityCategory.Market],
    ['Black Ferns vs France', 'Rugby Union', ActivityCategory.Outdoors],
    ['Weekly Dance Fitness', 'Fitness ', ActivityCategory.Outdoors],
    [
      'Leadership and Management',
      'Business & Professional',
      ActivityCategory.Workshop,
    ],
    ['Quiz Night', 'Quiz, Karaoke', ActivityCategory.Community],
  ])('maps "%s" (%s) to %s', (title, label, expected) => {
    expect(inferCategory({ title, labels: [label] })).toBe(expected);
  });

  it('lets the title name its own format ahead of the source category', () => {
    expect(
      inferCategory({
        title: 'Light Mood Impact: Watercolour Landscape Workshop',
        labels: ['Arts and Crafts'],
      }),
    ).toBe(ActivityCategory.Workshop);
    expect(
      inferCategory({
        title: 'Woodlands Antique and Collectables Fair',
        labels: ['Lifestyle Shows, Expos'],
      }),
    ).toBe(ActivityCategory.Market);
  });

  it('treats an exhibition in the title as arts', () => {
    expect(
      inferCategory({
        title: 'Chapters: A Life of Bookstores exhibition',
        labels: ['Heritage', 'Archives'],
      }),
    ).toBe(ActivityCategory.ArtsMusic);
  });

  it('treats an audience of children as family ahead of the source category', () => {
    expect(
      inferCategory({
        title: 'Exploring with ScratchMaths',
        labels: ['Technology'],
        audiences: ['Children', 'Youth and Teens'],
      }),
    ).toBe(ActivityCategory.Family);
    expect(
      inferCategory({
        title: '2D Game Design',
        labels: ['Technology', 'Creativity'],
        audiences: ['Youth and Teens', 'Adults'],
      }),
    ).toBe(ActivityCategory.Workshop);
  });

  it('trusts a general source category over title keywords', () => {
    expect(
      inferCategory({
        title: 'Waikato Home & Garden Show',
        labels: ['Lifestyle Shows, Expos'],
      }),
    ).toBe(ActivityCategory.Community);
  });

  it('prefers a specific label to a general one in any order', () => {
    expect(
      inferCategory({
        title: 'Hamilton City Hack Club',
        labels: ['Creativity', 'Technology'],
      }),
    ).toBe(ActivityCategory.Workshop);
  });

  it('falls back to keywords when no label is known', () => {
    expect(
      inferCategory({
        title: 'Riverside Parkrun',
        labels: ['Sports & Outdoors'],
      }),
    ).toBe(ActivityCategory.Outdoors);
    expect(
      inferCategory({
        title: 'Pottery for beginners',
        labels: ['Workshops & Classes'],
      }),
    ).toBe(ActivityCategory.Workshop);
    expect(
      inferCategory({
        title: 'Taonga Puoro',
        text: 'A performance of traditional Maori instruments',
      }),
    ).toBe(ActivityCategory.ArtsMusic);
    expect(inferCategory({ title: 'Volunteer meetup' })).toBe(
      ActivityCategory.Community,
    );
  });
});

describe('isKnownLabel', () => {
  it('matches labels regardless of case and spacing', () => {
    expect(isKnownLabel('  Classical  MUSIC ')).toBe(true);
    expect(isKnownLabel('Quiz, Karaoke')).toBe(true);
    expect(isKnownLabel('Sports & Outdoors')).toBe(false);
  });
});

import {
  ActivityDateResponseDto,
  ActivityResponseDto,
  TagResponseDto,
  VenueResponseDto,
} from './dto/activity-response.dto';
import { Activity } from './entities/activity.entity';
import { Tag } from './entities/tag.entity';
import { Venue } from './entities/venue.entity';

export function toVenueResponse(venue: Venue): VenueResponseDto {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    suburb: venue.suburb,
    city: venue.city,
    latitude: venue.latitude,
    longitude: venue.longitude,
  };
}

export function toTagResponse(tag: Tag): TagResponseDto {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  };
}

export function toActivityResponse(activity: Activity): ActivityResponseDto {
  const dates: ActivityDateResponseDto[] = [...(activity.dates ?? [])]
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
    .map((date) => ({
      id: date.id,
      startsAt: date.startsAt.toISOString(),
      endsAt: date.endsAt?.toISOString() ?? null,
      timezone: date.timezone,
      isAllDay: date.isAllDay,
      recurrenceRule: date.recurrenceRule,
    }));
  const tags = [...(activity.activityTags ?? [])]
    .map((activityTag) => activityTag.tag)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(toTagResponse);

  return {
    id: activity.id,
    title: activity.title,
    slug: activity.slug,
    summary: activity.summary,
    description: activity.description,
    imageUrl: activity.imageUrl,
    costType: activity.costType,
    costAmountFrom:
      activity.costAmountFrom === null ? null : Number(activity.costAmountFrom),
    currency: activity.currency.trim(),
    costDetails: activity.costDetails,
    venue: activity.venue ? toVenueResponse(activity.venue) : null,
    sourceUrl: activity.sourceUrl,
    status: activity.status,
    publishedAt: activity.publishedAt?.toISOString() ?? null,
    cancelledAt: activity.cancelledAt?.toISOString() ?? null,
    dates,
    tags,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}

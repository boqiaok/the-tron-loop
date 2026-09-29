/**
 * SQL condition for an activity (aliased `activity`) without a weekly rule.
 * Regular activities are only listed on the Regular page, so the weekly
 * listings, day plans and weekly guides leave them out.
 */
export const NOT_REGULAR_ACTIVITY = `NOT EXISTS (
  SELECT 1 FROM "activity_dates" "regularDate"
  WHERE "regularDate"."activity_id" = activity.id
    AND "regularDate"."recurrence_rule" IS NOT NULL
)`;

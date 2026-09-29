# Database schema

whatson uses PostgreSQL with TypeORM migrations. Automatic schema
synchronisation is disabled in every environment.

## MVP entity relationships

```mermaid
erDiagram
    VENUES ||--o{ ACTIVITIES : hosts
    ACTIVITIES ||--o{ ACTIVITY_DATES : schedules
    ACTIVITIES ||--o{ ACTIVITY_TAGS : has
    TAGS ||--o{ ACTIVITY_TAGS : categorises
    WEEKLY_GUIDES ||--o{ WEEKLY_GUIDE_ITEMS : contains
    ACTIVITIES ||--o{ WEEKLY_GUIDE_ITEMS : selects
    SOURCES ||--o{ IMPORT_RUNS : executes
    SOURCES ||--o{ SOURCE_ITEMS : provides
    IMPORT_RUNS ||--o{ SOURCE_ITEMS : collects
    ACTIVITIES o|--o{ SOURCE_ITEMS : matches
    ADMIN_USERS ||--o{ AUDIT_LOGS : performs
```

## Delivery phases

### Activity core

- `activities` stores reusable activity content and publication state. A
  draft an editor declines becomes `rejected` with `rejected_at` and a
  `rejection_reason`; the row is kept so later imports leave it alone, and
  rejections as `not_suitable` hold back drafts with the same title.
  Imported activities keep a `source_snapshot` of the source's listing as last
  accepted, and a `pending_source_snapshot` when a published activity's source
  has since changed in a way that affects whether people can go.
- `activity_dates` stores one or more scheduled dates for an activity.
- `venues` stores reusable Hamilton venue and location data.
- `tags` stores public activity categories.
- `activity_tags` is the explicit many-to-many join table.

### Weekly guides

- `weekly_guides` stores each editorial week, keyed by its Monday in
  `Pacific/Auckland`, with an intro and publication state.
- `weekly_guide_items` selects and orders the week's picks, one row per
  activity with an optional editor's note. A pick shows the activity's
  sessions within that week.

### Ingestion

- `sources` stores approved data-source definitions.
- `import_runs` records each collection attempt and its result.
- `import_items` records each source item's outcome; items for rejected or
  cancelled activities are `ignored`, and published activities the source
  still lists as accepted are `unchanged`.
- `source_items` retains raw source evidence and review state.

### Administration

- `admin_users` stores administrator identities and password hashes.
- `audit_logs` records important administrative actions.

Only the activity-core tables are implemented in the initial migration. Later
tables are added with the feature that uses them.

## Conventions

- Primary keys use UUIDs.
- Database names use `snake_case`; TypeScript properties use `camelCase`.
- Times use PostgreSQL `timestamp with time zone` and are displayed in
  `Pacific/Auckland` unless a date specifies another timezone.
- Foreign-key columns are indexed when an existing composite index does not
  already cover them.
- Destructive relationship cleanup uses explicit `ON DELETE` rules.
- Every schema change is made through a reviewed migration.

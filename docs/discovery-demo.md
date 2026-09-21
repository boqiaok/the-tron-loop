# Discovery and itinerary demo

## Setup

1. Run the database migrations and development seed.
2. Add `GEMINI_API_KEY` to `server/.env` to enable natural-language parsing.
   `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`.
3. Start the server and web applications, then open `/discover` or use the
   prompt on the homepage.

When the API key is absent or parsing fails, the same feature remains available
through the structured preference form.

## Suggested presentation flow

Use: “Saturday from 12 to 5 with the kids. Something indoors, preferably free,
and we like crafts and science. Hamilton Central would be ideal.”

1. Show the extracted Required and Preferred preferences and edit one chip.
2. Compare the recommendation reasons and include the craft activity.
3. Build a two-activity plan and point out the estimated travel and arrival
   buffer.
4. Keep the first activity and replace the second; the replacement preserves
   the kept session and rechecks timing.
5. Change “prefer free” to “free required” to demonstrate the difference
   between ranking and filtering.
6. Use restrictive conditions to show that zero-result suggestions are backed
   by actual alternative queries.

When a request names a date but no time, the parser searches the full local day
from 00:00 to 23:59. Recommendations include sessions whose time overlaps the
requested window,
which allows drop-in and all-day events to appear when they are available
during the user's afternoon. The itinerary step still checks each event's
actual start/end times, travel time and arrival buffer before building a plan.
If a request has no date at all, it searches the next 7 days in
Pacific/Auckland and shows that assumption so the user can edit it.
If a request says “weekend”, it searches only the nearest Saturday and Sunday
window, from Saturday 00:00 through Monday 00:00 in Pacific/Auckland, rather
than returning activities from the whole week.
Topic words such as “arts” or “food” are treated as search terms: an activity
must match a topic in its title, summary, description, or tags before it can
appear. Free, suburb, and other preferences then rank the matching activities.
When no topic matches, the result can offer “Show all topics” as an explicit
broader search.
Travel times use straight-line venue distance, a 1.3 road factor, and fixed
driving/walking speeds. They are labelled as estimates in the interface.

## Plan scheduling data

Activities use `fixed` timing for fixed sessions and `window` timing for a
drop-in opening window. Multiple fixed sessions remain separate `ActivityDate`
records. Window activities require `visitMinutes` and retain a
`durationSource` of `source`, `parsed`, `category_default`, or `manual`.
Category defaults are applied once during ingestion and can be corrected in the
admin activity form. Parsed and default durations are labelled as estimates.

Plan generation is deterministic and does not call Gemini. It places flexible
visits inside their opening window, preserves fixed sessions, includes travel
and the arrival buffer, and rejects combinations that do not fit. Keep,
Replace, and Remove rebuild through the same rules. A completed plan can be
exported as `.ics`; flexible visits use their planned time in the calendar.

The weekly guide can sort by distance after the visitor chooses **Nearest** and
allows browser location access. Distance is calculated and sorted by the API
before pagination. Venues without coordinates remain visible after venues with
a known distance. Weather is not used by planning.

## Gemini configuration and validation

Create a key in [Google AI Studio](https://aistudio.google.com/apikey), choosing
or creating a Google Cloud project. Set these variables in `server/.env` and
restart the server:

```dotenv
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

The default model has a [free tier](https://ai.google.dev/gemini-api/docs/pricing),
subject to project/region availability and rate limits. Check your AI Studio
limits; free access is not unlimited. Keep the key server-side and out of Git.
Remove the old OPENAI_API_KEY and OPENAI_MODEL entries; they are no longer read.

The official `@google/genai` SDK calls the recommended Interactions API with an
`application/json` response format and JSON Schema. The same schema
is validated locally with Ajv without coercion before normalization; calendar
dates, clock times and window ordering are also checked. Requests time out after
8 seconds with one attempt (no retries). Missing/blank keys, quota or provider
errors, empty/invalid JSON, invalid structures and incomplete time windows return
`manualEntryRequired: true` and the existing condition form remains usable.

`POST /api/v1/discovery/parse`, its request and DiscoveryIntent stay unchanged.
For wire compatibility, successful parses retain the legacy `source: "openai"`
value even though Gemini now performs the parsing. `source: "manual"` still marks
fallbacks. No OpenAI SDK or OpenAI network calls remain. Ranking, recommendation
reasons and itinerary algorithms do not use Gemini. The scheduling fields are
added by the `AddActivityScheduling` migration.

Run `pnpm --filter server test --runInBand`,
`pnpm --filter server test:e2e --runInBand`, and `pnpm --filter web test`.
The dedicated discovery parse HTTP suite requires neither PostgreSQL nor a real
Gemini key; it mocks the SDK boundary. The full application e2e suite requires
the existing test database. For a live smoke test, configure your key, open
`/discover`, submit the example above and verify/edit the extracted conditions.

References: [official SDK](https://ai.google.dev/gemini-api/docs/libraries),
[structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output),
[key setup](https://ai.google.dev/gemini-api/docs/api-key).

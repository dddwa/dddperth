# Date and time patterns

Read this before adding or reviewing clocks, conference dates, deadlines, date inputs, date formatting, calendars, or time-dependent tests. These rules apply to the shared website and conference configuration.

## Choose the clock

Conference behaviour uses the request's `DateTimeProvider`, including CFP/voting/ticket windows, agenda publication, speaker deadlines, feedback availability, countdowns, and run-sheet highlights.

```ts
import { getDateTimeProvider } from '~/remix-app-load-context'

// Inside a loader/action with its request context:
const clock = getDateTimeProvider(context)
const now = clock.nowDate() // Luxon DateTime in the conference timezone
const nowMillis = clock.now() // epoch milliseconds
```

Capture the value once per calculation. Pass `now` or the provider into domain helpers; require that argument rather than defaulting it to `DateTime.now()`. Obtain the provider from context rather than constructing a `SystemDateTimeProvider` in feature code: context selects the admin or development override for that request.

Real-world operational time must keep advancing independently of conference overrides: authentication/session/token expiry, anti-spam elapsed time, sync locks/heartbeats, cache freshness, audit writes, and unique upload keys. Use a real system clock for those purposes and keep the reason explicit at the boundary. `Date.now()` is an epoch instant and `new Date().toISOString()` is UTC; neither is inherently a timezone bug. If an operational clock needs injection for testing, keep it separate from the overridable conference clock.

The admin settings and overlay deliberately display real **system time** alongside the override. Their system-clock reads serve that distinction. The provider's timers also remain real timers; an override changes the returned instant, not timer execution.

See [the provider interface](../website/app/lib/dates/date-time-provider.server.ts), [context selection](../website/app/load-context.server.ts), and [system implementation](../website/app/lib/dates/system-date-time-provider.server.ts).

## Parse and display in the conference timezone

```ts
import { conferenceDateTime } from '~/lib/dates/conference-date-time'
import { DateTime } from 'luxon' // formatting constants and types only

const event = conferenceDateTime.fromISO(iso)
const label = event.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'en-AU' })

// Intentional override for another region; ordinary callers omit options.
const elsewhere = conferenceDateTime.fromISO(iso, { zone: 'Europe/London' })
```

[conferenceDateTime](../website/app/lib/dates/conference-date-time.ts) automatically uses the IANA timezone in `@conference/config/public`. Use its `fromISO`, `fromMillis`, `fromSeconds`, `fromJSDate`, `fromFormat`, and `fromObject` constructors instead of raw Luxon construction. It returns ordinary Luxon DateTimes; it does not mutate Luxon's global settings. Explicit options override the default zone, and an undefined zone retains the conference default.

Configuration definitions bootstrap the app and cannot import website helpers without creating a project dependency cycle. In `conference/config` (or standalone `conference-stub/config`), construct dates with an explicit `zone: conferenceConfigPublic.timezone` imported from the sibling public config. Application features use the automatic helper.

- An ISO string **without an offset** is a conference wall time, including Sessionize schedule values and `datetime-local` form values. Interpret it with `conferenceDateTime.fromISO(value)` by default.
- An ISO string **with `Z` or an offset** identifies an instant. `conferenceDateTime.fromISO(value)` preserves that instant and converts its representation to conference time. Without `{ zone }`, Luxon converts it to the host timezone by default.
- Use `{ setZone: true }` only when retaining the source offset is intentional. A fixed offset does not carry a region's daylight-saving rules. For conference display and calendar arithmetic, use the named conference zone.
- Convert epoch values with `conferenceDateTime.fromMillis(ms)` or `conferenceDateTime.fromSeconds(seconds)`; make units clear in names. `DateTimeProvider.now()` returns milliseconds; many D1 fields store seconds.
- Convert both operands to the conference zone before `hasSame(..., 'day')`, `startOf('day')`, weekday calculations, or calendar-day differences. Equal instants can have different calendar dates in different zones.
- `locale: 'en-AU'` controls formatting, not timezone. Native `Date` carries an instant but loses the Luxon zone. Keep Luxon values through weekday/date calculations; when a native formatter is required, supply `timeZone: zone`.

## Distinguish dates, instants, and durations

`yyyy-MM-dd` is a calendar date. Keep it as a date string at boundaries and parse it with the conference zone for calendar operations. Native `new Date('yyyy-MM-dd')` treats it as UTC midnight, which can display as the previous date in another timezone.

Serialize instants with `.toISO()` (offset included) or epoch milliseconds. Reconstruct them with the explicit conference zone in components. Do not strip an instant's offset and then reinterpret the wall time in another zone. Use `.toISODate()` only when intentionally returning a calendar date; preserve the full instant for schedule times and deadlines.

Choose the calculation from the requirement:

```ts
// Calendar-day countdown / Today / Tomorrow in conference time:
const zone = now.zone // provider DateTime already uses the conference zone
const calendarDays = event.setZone(zone).startOf('day')
    .diff(now.setZone(zone).startOf('day'), 'days').days

// Exact elapsed duration, independent of timezone:
const elapsedMillis = now.toMillis() - startedAt.toMillis()
```

For calendar windows use Luxon `.plus({ days: 1 })` in the named zone. A calendar day can span 23 or 25 hours where daylight saving applies. For a strict 24-hour duration use milliseconds or hours. Give interval boundaries an explicit rule (normally start inclusive, end exclusive), and check before, at, and after each boundary. An all-day entry stays available through the local day rather than expiring at its configured start time.

Use [speaker calendar generation](../website/app/lib/speakers/calendar.server.ts) and [agenda calendar generation](../website/app/lib/my-agenda-calendar.server.ts) as examples: convert event times to UTC before emitting calendar fields marked as UTC.

## Inputs and invalid values

For a `datetime-local` input, format the stored instant in the conference zone with `toFormat("yyyy-MM-dd'T'HH:mm")`. Parse submitted values with `conferenceDateTime.fromISO(raw)`, then persist `.toISO()`. [Speaker settings](../website/app/lib/admin-settings/speakers.ts) contains the conversion helpers.

The app enables `Settings.throwOnInvalid = true` in `root.tsx`. Wrap parsing of untrusted cookies, forms, and external timestamps in `try/catch` as well as checking validity; an `.isValid` check alone cannot handle a thrown parse. Return a validation error or the feature's defined fallback. The [development provider](../website/app/lib/dates/dev-date-time-provider.server.ts) demonstrates this. For conferences with daylight-saving transitions, define how ambiguous or nonexistent wall times should be handled before accepting them; normalization alone is not validation of the entered wall time.

## Browser clocks and verification

Components receive a serialized provider instant from their loader. If conference time must advance while the page stays open, anchor it to that instant and add elapsed browser time after mount; preserve the server value for hydration. [useConferenceClock](../website/app/lib/dates/use-conference-clock.ts) implements this pattern using monotonic elapsed time, shared by feedback links and run-sheet highlights. Reset the anchor when loader data changes. Read the device wall clock directly only when the feature explicitly calls for device time.

Use [MockDateTimeProvider](../website/app/lib/test-utils/mock-date-time-provider.ts) for fixed-clock unit tests. Verify affected behaviour with a host timezone different from the conference (UTC and America/Los_Angeles catch common mistakes), around conference midnight, and before/at/after opening and closing instants. Use a daylight-saving conference zone when changing shared calendar arithmetic. Client tests should also use a browser timezone different from the conference and check that hydration agrees with server output.

For manual date-gated checks, use `/admin/settings` rather than changing conference configuration dates. The signed `__adminDateTime` cookie affects only that admin session, including in production. E2E can use `__devDateOverride` only through the existing development guards (`E2E_DATE_OVERRIDE=true` and a non-production build); preserve the production bundle exclusion test.

## Lint enforcement

The existing Nx lint targets enforce three local rules:

- `dates/use-conference-date-time`: use the configured-zone helper for application construction, including aliased and namespace Luxon imports. Config bootstrap files must supply their explicit zone.
- `dates/use-date-time-provider`: feature code obtains now from the request provider. Operational reads need a narrow `eslint-disable-next-line` with the reason the clock must remain real. The system provider implements that real clock.
- `dates/no-native-date-calendar`: retain Luxon for calendar arithmetic; native Date formatting must supply an explicit `timeZone`. This rule uses type information when available so unrelated methods are not reported.

Tests may construct independent clocks/zones directly. Date constructors are not auto-fixed: choosing whether a value is a wall time, calendar date, instant, or operational timestamp requires intent. Lint protects construction and clock patterns; calendar-day semantics still need behaviour tests.

# Date and time patterns

Read this before adding or reviewing clocks, conference dates, deadlines, date inputs, formatting, calendars, or time-dependent tests. The website and conference configuration use standard Temporal values. Import Temporal through the date module: it selects native support or `temporal-polyfill`, without installing globals, so browsers and Workers behave consistently. Selection uses feature detection at module evaluation. The package statically imports its fallback, so native browsers still receive and evaluate the polyfill code; this is not conditional loading.

## Choose the value and timezone

```ts
import { conferenceDate, conferenceTime, conferenceDayStart, conferenceInstant, Temporal } from '~/lib/dates/temporal'

const day = conferenceDate('2026-10-03') // Temporal.PlainDate
const event = conferenceTime('2026-10-03T09:00') // Temporal.ZonedDateTime
const midnight = conferenceDayStart('2026-10-03') // Explicit date → zoned midnight
const recordedAt = conferenceInstant(epochSeconds * 1000) // Zoned representation of an instant
```

The [date module](../website/app/lib/dates/temporal.ts) defaults to the IANA timezone in `@conference/config/public`. Ordinary callers omit timezone options. Use `{ timeZone: 'Europe/London' }` only when the domain needs another zone.

- Calendar dates use `Temporal.PlainDate`; scheduled local events use `Temporal.ZonedDateTime`; exact timestamps use `Temporal.Instant`; times of day without dates use `Temporal.PlainTime`.
- `conferenceDate` accepts only `YYYY-MM-DD`. Use `conferenceDayStart` when the requirement explicitly needs the start of that local day. Native `new Date('YYYY-MM-DD')` means UTC midnight and can shift the calendar date.
- `conferenceTime` accepts datetimes. Offset-free strings, including Sessionize times and `datetime-local` inputs, mean conference wall time. Strings with `Z`, offsets (including Jira's `+0800`), or IANA annotations preserve the represented instant and convert to conference time.
- Ambiguous or nonexistent wall times throw `RangeError`. The default disambiguation is `reject`; explicitly choose `earlier`, `later`, or `compatible` only when the requirement defines that policy.
- `conferenceInstant` takes epoch **milliseconds**. Provider `now()` returns milliseconds; many database timestamps are **seconds**. Make units explicit.

Conference config bootstraps the manifest. Its `config/dates.ts` binds [createConferenceDates](../libs/conference-config/src/dates.ts) to the sibling public config once. Year and speaker configs import `conferenceTime` there. Keep this seam independent of the full manifest and website to avoid dependency cycles. The reference conference uses the same pattern.

## Choose the clock

Conference behaviour uses the request's [DateTimeProvider](../website/app/lib/dates/date-time-provider.server.ts), including CFP/voting/ticket windows, publication, speaker deadlines, feedback, countdowns, and run-sheet highlights.

```ts
import { getDateTimeProvider } from '~/remix-app-load-context'

const clock = getDateTimeProvider(context)
const now = clock.nowDate() // Temporal.ZonedDateTime in the configured zone
const nowMillis = clock.now() // epoch milliseconds
const instant = now.toInstant()
```

Capture now once per calculation and pass it into helpers as a required argument. [Context selection](../website/app/load-context.server.ts) supplies request overrides. Direct `Temporal.Now` reads belong in the [system provider](../website/app/lib/dates/system-date-time-provider.server.ts).

Authentication/session/token expiry, anti-spam elapsed time, locks/heartbeats, cache freshness, audit writes, and unique upload keys use real operational time independently of conference overrides. Explain that requirement with a narrow lint suppression at the clock read. `Date.now()` is an epoch instant and `new Date().toISOString()` is UTC; these operational boundaries remain valid. Inject a separate operational clock when testing requires one.

Admin settings and the overlay deliberately display real system time beside the override; their loaders use the system provider for that display. Provider timers remain real timers; an override changes the returned instant, not timer execution.

## Arithmetic, comparisons, and boundaries

```ts
const tomorrow = now.add({ days: 1 }) // Calendar day: may span 23 or 25 hours
const after24Hours = now.add({ hours: 24 }) // Exact duration
const hasStarted = Temporal.ZonedDateTime.compare(event, now) <= 0
const sameDay = event.toPlainDate().equals(now.toPlainDate())
const calendarDays = now.toPlainDate().until(event.toPlainDate()).days
const elapsedMillis = now.epochMilliseconds - event.epochMilliseconds
```

Use standard `.compare()`, `.equals()`, `.until()`/`.since()`, and `.add()`/`.subtract()`. Implicit numeric coercion and `<`/`>` throw for Temporal objects. Convert operands to the conference zone before comparing local calendar dates. Calendar days and elapsed 24-hour periods are different requirements; choose explicitly.

Define opening/closing boundaries (normally start inclusive, end exclusive), then check before, at, and after them. All-day entries remain available through the local day rather than expiring at the configured start time. Use `.startOfDay()` for zoned calendar boundaries.

## Formatting, serialization, and inputs

Use standard locale options rather than date-format tokens:

```ts
const label = event.toLocaleString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
const time = event.toLocaleString('en-AU', { hour: 'numeric', minute: '2-digit' })
const input = event.toPlainDateTime().toString({ smallestUnit: 'minute' })
const iso = event.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 })
```

Locale controls presentation, not timezone. Zoned values carry the configured zone. Native Date formatters require an explicit `timeZone`; keep Temporal through calendar arithmetic and formatting.

Loaders and persisted settings carry ISO strings, reconstructed at the receiving boundary. Calendar dates use `.toPlainDate().toString()`; scheduled times use `.toString()` (with an IANA annotation) or the offset-bearing form above when preserving an existing wire format. Exact instants use `.toInstant().toString()` or epoch milliseconds. Preserve offsets when transferring an instant.

For `datetime-local`, display conference wall time with `.toPlainDateTime().toString({ smallestUnit: 'minute' })`, parse submissions with `conferenceTime`, and persist offset-bearing ISO. [Speaker settings](../website/app/lib/admin-settings/speakers.ts) demonstrates validation and the round trip.

Convert to UTC with `.withTimeZone('UTC')` before emitting calendar fields marked UTC. See [speaker calendars](../website/app/lib/speakers/calendar.server.ts) and [agenda calendars](../website/app/lib/my-agenda-calendar.server.ts).

Temporal throws for invalid input; it does not return an invalid object. Catch failures at form, cookie, and external-data boundaries, then return validation errors or the feature's fallback. [tryConferenceTime](../website/app/lib/dates/temporal.ts) returns `undefined` for optional untrusted timestamps. Trusted config fails fast. The [development provider](../website/app/lib/dates/dev-date-time-provider.server.ts) ignores malformed overrides.

## Browser clocks and verification

Components receive a serialized provider instant from loaders. [useConferenceClock](../website/app/lib/dates/use-conference-clock.ts) anchors browser updates to it and adds monotonic elapsed time after mount, preserving the server value during hydration. Reset the anchor when loader data changes. Use this clock for advancing feedback and run-sheet state.

Use [MockDateTimeProvider](../website/app/lib/test-utils/mock-date-time-provider.ts) for fixed-clock tests. Check UTC and America/Los_Angeles hosts, conference midnight, opening/closing instants, and a daylight-saving conference zone when changing shared arithmetic. Browser tests should use a different timezone and verify hydration agreement.

Run `pnpm nx temporal-check website` for native/polyfilled agreement, Workers execution, and SSR hydration in Chromium, Firefox, and WebKit. Install engines with `pnpm nx setup-temporal-browsers website`. The check reports an isolated date-operation bundle size, not whole-site payload.

For manual date-gated checks use `/admin/settings`, rather than editing config dates. The signed `__adminDateTime` cookie affects only that admin session. E2E may use `__devDateOverride` through the existing development guards (`E2E_DATE_OVERRIDE=true` and a non-production build); preserve the production-bundle exclusion test.

## Lint enforcement

Nx lint enforces these rules in application code and conference configuration (both forks and standalone core):

- `dates/use-conference-date-time`: import Temporal through the date module; direct polyfill imports and global Temporal access bypass the shared runtime seam. Luxon is forbidden.
- `dates/use-date-time-provider`: obtain now from the request provider; operational reads need a narrow documented exception.
- `dates/no-native-date-calendar`: Temporal handles calendar arithmetic and component-based constructors such as `new Date(year, month, day)`; native Date formatters require an explicit timezone.
- `dates/no-temporal-coercion`: typed checks reject implicit Temporal arithmetic and ordering, including compound assignments, increment/decrement, and bitwise operators. Explicit string formatting and epoch arithmetic remain valid.

Tests may construct independent clocks and zones. Choosing a calendar date, wall time, instant, or operational timestamp requires intent, so lint does not automatically rewrite dates. Boundary semantics also need behaviour tests.

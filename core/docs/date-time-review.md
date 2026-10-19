# Date and time audit

Reviewed commit `5ff4b12` on 2026-10-19. Scope: website application and workers, conference/stub configuration, shared library, migrations, and date-related scripts. This is a source audit with targeted runtime reproductions, not an end-to-end verification. The findings below describe the reviewed baseline; the subsequent implementation is recorded under Remediation. Follow [the date and time patterns](date-time.md) for remediation.

## Findings

### 1. P2 — Important-date calendar comparisons use the host timezone

`website/app/components/page-components/important-dates.tsx:36–37,107,175–176` parses ISO strings without a zone, then uses `currentDate.hasSame(eventDateTime, 'day')` at lines 58 and 145. `currentDate` is reconstructed in the conference zone, but `eventDateTime` is converted to the server/browser zone. `hasSame` compares calendar fields, so this can produce different Today/Tomorrow labels during SSR and hydration.

Reproduction: at `2026-07-12T23:30+08:00`, the configured voting opening `2026-07-13T00:00+08:00` is labelled **Today!** with a UTC or Los Angeles host; a Perth host correctly says **Tomorrow!**. `EventInfo` already formats in conference time, making the incorrect label internally inconsistent.

Remediation: parse all event values with the manifest timezone and use matching zones for calendar comparisons. Offset-bearing values still compare correctly as instants with `<`/`>=`; those comparisons alone are not the bug.

### 2. P2 — Speaker deadline labels can show the previous date

`website/app/components/speaker-checklist-card.tsx:52–54` and `website/app/routes/admin.speakers._index.tsx:430–432` format `DateTime.fromISO(dueDateIso)` without a zone. An admin-entered deadline at `2026-09-25T00:00+08:00` displays as **24 September** on a UTC server or Los Angeles browser. A Perth browser renders 25 September, also creating hydration differences.

Remediation: format in `conferenceManifest.public.timezone` at both sites, preferably through one shared formatter. Keep exact deadline checks as instant comparisons.

### 3. P2 — Exhibitor export discards the conference zone before weekday arithmetic

`website/app/routes/admin.sponsors.exhibitor-export.tsx:50–51` calls `.toJSDate()`. `website/app/lib/sponsors/exhibitor-export.ts:138–147` then uses host-local `getDay`, `getDate`, `setDate`, and `getMonth`; line 281 also formats without `timeZone`.

Reproduction using the actual `splitBumpSlot`: conference `2026-10-03T09:00+08:00` and slot `Saturday 4pm` produce **03/10/2026** in UTC/Perth, but **26/09/2026** with a Los Angeles host. There the instant falls on Friday, so walking back to Saturday moves the slot a whole week early. The current 2026 09:00 configuration does not reproduce this under UTC; it remains host-dependent and earlier conference start times can also cross the UTC date boundary.

Remediation: retain the Luxon conference date and its named zone through weekday arithmetic and title formatting, or pass the date and timezone explicitly.

### 4. P2 — Run-sheet highlighting bypasses the overridable conference clock

`website/app/components/runsheet-now.tsx:23–28,44–45` reads `Date.now()` directly. Both run-sheet routes use this hook, while server route availability uses `getDateTimeProvider(context)` through `runsheet-availability.server.ts`.

An admin can override into conference day and load the run sheet, but “Now” rows and “Jump to now” follow the actual device date. A device clock skew also changes the selected rows. The timestamp parsing in `runsheet-now.ts` is explicitly zoned and is correct; the clock source is the issue.

Remediation: return the request provider instant from both loaders and anchor a ticking client clock to it, following the feedback clock pattern. This finding comes from source tracing; no interactive browser reproduction was run.

### 5. P2 — Historical conference dates depend on the runtime timezone

`conference/config/years/2015.ts:8`, `2018.ts:8`, `2019.ts:8`, `2021.ts:7`, `2022.ts:7`, `2023.ts:9`, and `2024.ts:62` use `DateTime.fromISO('yyyy-MM-dd')` without a zone. Those dates become host-midnight instants instead of Perth-midnight instants. This can alter archived labels when converted to the conference zone and affects comparisons/exports consuming the DateTime.

Reproduction: parsing `2024-11-16` on a Sydney host, then converting to Perth, gives **2024-11-15**. UTC and Perth hosts retain the intended calendar date, but represent different instants. The 2025/2026 configurations and stub date definitions already specify zones.

Remediation: assign the explicit conference timezone to these definitions without changing their calendar dates.

### 6. P2 — Conference-day important information disappears at the start instant

`website/app/components/page-components/important-dates.tsx:185–193` filters a standalone event once `currentDate > dateInfo.dateTime`. The conference event from `calculate-important-dates.server.ts:53–61` has `onDayMessage: 'Important Info'` but no `eventClosedHref`. It is therefore removed after the configured conference start (09:00 in 2026), although its on-day rendering branch should remain relevant throughout conference day.

This is an instant-versus-calendar-day error, independent of host timezone. Remediation: evaluate on-day visibility in conference time before treating the event as past, and test morning, afternoon, and the following midnight. This finding is source-derived.

## Clock and parser inventory: follow-up risks and intentional exceptions

- `speakers/checklist.ts:162,220` defaults to `DateTime.now()`. Current production callers supply `now`, so these are latent provider bypasses rather than an observed live-path failure. Make the arguments required. Its offset-bearing deadline comparisons preserve instants; unzoned parsing there is still a poor pattern for future offset-free callers.
- `calculate-important-dates.server.ts:65` and `runsheets/sponsor-bump-in.server.ts:185` parse without zones for sorting. Current inputs carry offsets, and ordering those instants is valid. An explicit zone would protect future offset-free inputs; these are not separate confirmed bugs.
- `admin.settings.tsx:31` and `_layout.tsx:30` intentionally expose real system time alongside the override. `QuickJumpButton`'s `DateTime.now()` fallback at `admin.settings.tsx:419` is unnecessary nondeterminism, but current quick-jump entries supply their dates.
- `d1-auth-service.server.ts`, `auth.server.ts`, sponsor token expiry/reminders, `_layout.feedback.tsx` anti-spam timing, sync staleness checks, voting-validation heartbeats, run-sheet cache freshness, persisted audit timestamps, shortlist timestamps, and upload-key timestamps use real operational time. They should not inherit admin conference overrides. UTC ISO/epoch storage here is timezone-safe; use a separate injectable real clock if deterministic operational tests are needed.
- `feedback-link.tsx` already anchors a browser clock to the loader's provider instant. Its `Date.now()` calls measure elapsed time rather than replacing the provider's date. A monotonic elapsed clock would improve resistance to device-clock adjustments.
- Sitemap/content-page lastmod, RSS fallback dates, and the catch-all route's article publication metadata use real current time. These are metadata semantics concerns (especially declaring request time as publication/modification time), not demonstrated conference timezone failures. Offset-bearing ISO output is unambiguous.
- `root.tsx` enables `Settings.throwOnInvalid`. Admin date actions/provider and speaker-settings form/schema parsing have paths that check `.isValid` without catching thrown invalid parses. Malformed values can become exceptions instead of validation errors. The development provider and talk-ended helper already handle this; include invalid-input checks when changing date boundaries.
- Speaker and personal-agenda ICS generation converts times to UTC before emitting UTC fields. Sessionize formatting, feedback target parsing, run-sheet closure and overlap calculations, and resolved speaker settings already supply conference zones.
- Date-only token-expiry keys use UTC intentionally across the Jira auth script, reminder key, and display. Changing them to conference time alone would break that consistency. Script polling deadlines are elapsed real time and do not need the conference provider.

## Verification

Ran a Node/Luxon assertion script using the installed website dependencies with host zones UTC, Australia/Perth, America/Los_Angeles, and Australia/Sydney. It exercised the important-date `hasSame` expression, deadline display date, historical-config parsing, and the actual exported `splitBumpSlot` function. All asserted failure cases above reproduced; explicit conference-zone controls stayed stable. Review findings 4 and 6 were traced through callers rather than browser-tested. Existing relative-time tests explicitly define rolling-duration labels, so their Today/Yesterday wording was not reported as a new defect.

No application changes or regression tests were added in this review. Remediation should add focused timezone and override coverage through the website's Nx targets.

## Remediation

The follow-up change adds `conferenceDateTime`, defaulting to the public config IANA zone, and the three date lint rules documented in the guide. Application constructors now use that helper; historical config dates use the public config zone. Exhibitor calendar arithmetic stays in Luxon, both run sheets use a provider-anchored monotonic browser clock, and on-day important information stays visible until the next conference-local midnight. These changes address findings 1–6. Invalid-input validation and metadata publication semantics remain separate follow-up concerns.

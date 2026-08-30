# Accessibility backlog

Tracked findings from the WCAG 2.1 AA audit (branch `a11y/audit-and-ci`) that were **not** fixed in that pass — either
out of scope for this pass, needing design/content input, or on lower-priority (admin/portal) pages. This file is
meant to be turned into a GitHub issue (or several) for follow-up; it is not itself a tracker.

Items are grouped by page/area, roughly in priority order (public-facing first). Each entry lists the file,
the relevant WCAG criterion/rule where known, a short description, and a suggested fix.

Fixes already made (landmarks, heading order, skip link, `TalkOptionCard` keyboard support, the voting page live
region, and jsx-a11y lint tightening) are **not** repeated here — see the commit history for those.

## Fixed in the `a11y/e2e-seams` follow-up

Recorded here because these were found *by* widening the automated coverage, and the entries below explain why
they weren't caught the first time:

- **Agenda grid: orphaned ARIA table roles** (`_layout.agenda.($year).tsx`) — `role="rowheader"` /
  `role="columnheader"` on a flat CSS grid with no `role="row"`/`role="grid"` ancestor. Axe rates this
  `aria-required-parent`, **critical**: it tells a screen reader it's in a table, then gives it no row/column
  structure to navigate. Roles removed (the `aria-label`s are kept). Missed originally because the only agenda
  route under test was the current year, which renders an empty "not announced yet" state.
- **Sponsors empty/cancelled states had no `<h1>`** (`_layout.sponsors.($year).tsx`) — the populated branch had
  one, the two empty branches didn't. Same `srOnly` heading pattern as the agenda page.
- **Blog posts had no `<h1>`** (`_layout.blog.$slug.tsx`) — the post title was a bare `<div>`. Missed originally
  because `/blog/:slug` was not in the route list.
- **Skip-link breakpoint mismatch** (`skip-to-content.tsx`) — the "Skip to Navigation" variants swapped at `md`
  (768px) while the header's hamburger/desktop-nav swap happens at `lg` (1024px), so 768–1023px pointed at
  `#header` while the nav was still collapsed in the closed drawer. Now `lg` in both places, asserted across
  five widths in `e2e/a11y.spec.ts`.
- **Voting live region announced nothing** (`_layout.voting.tsx`) — the message was tied to `voteSubmitted`,
  which is cleared after 200ms; a polite live region generally won't announce something that appears and
  disappears that fast. Now held in its own state for ~3s.
- **Route list pinned to a fixture year.** An earlier draft of this work also scanned the unpinned `/agenda`,
  `/sponsors` and `/voting`, tagged as "empty state" coverage. That was wrong: those routes track the current
  conference, so they'd flip to populated the moment `agendaPublishedDateTime` passed (which it does the day
  this was written) or a new year landed — turning the empty-state assertions and their visual baselines into
  silent no-ops. Every conference-scoped route is now pinned to 2025.
- **`TalkOptionCard` mixed theme tokens with a theme-invariant surface.** The card forces `bg="white"` in both
  themes, but its text and pills used theme-reactive tokens, so it failed contrast in *both* directions:
  `indigo.1` resolved near-black behind `indigo.8` pill text under the dark theme (3.03:1), and `gray.7`
  description text resolved *light* on the white card under the light theme (~1.6:1). Both are now literal
  values, with a comment on the component explaining that the surface and its colours must change together.
  Neither was findable before — the card only renders in the live voting flow, which needed the date override
  *and* the Sessionize fixtures to reach.
- **`TalkOptionCard` dropped out of the tab order** — it used `disabled` while a vote was in flight, silently
  losing keyboard focus. Now `aria-disabled` (Panda's `_disabled` condition already matches
  `[aria-disabled=true]`, so the styling is unchanged).

## Blog (`/blog`, `/blog/:slug`)

The blog index in particular is a known work-in-progress page — it renders as unstyled, unlabelled `<div>`/`<p>`
markup (no PandaCSS styling at all), unlike every other route in the app. The automated a11y e2e suite
(`core/website/e2e/a11y.spec.ts`) currently fails on **both** `/blog` and `/blog/:slug` for exactly this reason
(`color-contrast` and `image-alt`); those two failures are expected until the pages get their real design, and
they are the only remaining failures in the suite. Everything else passes in both themes.

- **File:** `core/website/app/routes/_layout.blog._index.tsx`
  **WCAG:** 1.4.3 Contrast (Minimum)
  **Found by:** automated axe scan (`nx e2e website`), rule `color-contrast`
  **Description:** Default browser link/text colours on the unstyled post cards don't meet the 4.5:1 text contrast
  ratio.
  **Suggested fix:** Comes for free once this page gets real PandaCSS styling using the existing theme tokens
  (`text.primary`/`text.secondary` etc., same as every other route) — no separate contrast fix needed once that
  happens, but flagging so the eventual redesign doesn't accidentally regress it.

- **File:** `core/website/app/lib/services/content-service.ts` (the `imageAlt?: string` field), consumed by
  `core/website/app/routes/_layout.blog._index.tsx` and `_layout.blog.$slug.tsx`
  **WCAG:** 1.1.1 Non-text Content
  **Found by:** automated axe scan, rule `image-alt`
  **Description:** `imageAlt` is optional on the content-service type and is passed straight from MDX frontmatter
  with no validation and no fallback. A blog post can set `image` without `imageAlt`, producing an `<img>` with no
  `alt` attribute at all. Confirmed reproducible against this environment's actual blog content.
  **Suggested fix:** Enforce `imageAlt` at the frontmatter-schema level whenever `image` is set (fail content
  build/lint rather than ship a missing alt), rather than papering over it with `alt=""` in the route (these are
  meaningful thumbnail images, not decorative).

- **File:** `core/website/app/routes/_layout.blog._index.tsx`, `_layout.blog.$slug.tsx`
  **WCAG:** 1.3.1 Info and Relationships (general heading/structure hygiene)
  **Description:** Both pages are otherwise a flat stack of unstyled `<div>`/`<p>` with no visual hierarchy. The
  `<h1>`/`<h2>` fix already made in this pass gives them a correct heading *order*, but the page still reads as a
  wall of undifferentiated text to a screen reader user navigating by structure.
  **Suggested fix:** Fold into whatever ticket eventually gives `/blog` real styling.

## Sponsor portal (`/portal/*`)

Deprioritised per the audit's stated ordering (public pages → speaker/sponsor portal → admin), and not covered by
the automated e2e suite in this pass.

- **File:** `core/website/app/routes/auth.login.tsx` (and the shared portal/admin auth flow more broadly)
  **WCAG:** 4.1.3 Status Messages
  **Description:** The login-error message (`{error}` box) is a plain `<Box>` with no `role="alert"` /
  `aria-live`. Because the error only appears after a full page reload (server-rendered `action` error, not a
  client-side toast), a screen reader user isn't necessarily informed that an error appeared unless they happen to
  read down the page.
  **Suggested fix:** Add `role="alert"` to the error container, or move focus to it on render.

- **File:** `core/website/app/routes/portal.tsx`, `portal.profile.tsx`, `portal._index.tsx`
  **Description:** Not audited in this pass beyond a structural skim. Should get the same heading-order,
  landmark, and focus-visible review the public pages got here.

## Admin (`/admin/*`)

Explicitly deprioritised per the task's stated ordering (internal-facing, lower traffic, lower risk). Not covered
by the automated e2e suite in this pass — axe scans and the eslint `jsx-a11y` component mapping (`Box`/`Flex`/
`Grid` → native elements) still apply to admin code since they're workspace-wide, but no admin routes were manually
reviewed beyond a structural skim (`admin.tsx`'s layout already has a `<nav>` + `<main>`, which is good).

- **Files:** `core/website/app/routes/admin.*`, `core/website/app/components/agenda-planner.tsx`
  **Description:** The voting-agenda builder (`agenda-planner.tsx`) is a drag-and-drop interface — worth checking
  specifically for a keyboard-operable equivalent to drag-and-drop reordering (WCAG 2.1.1), which wasn't audited
  here.
  **Suggested fix:** Dedicated pass once the public-page backlog above is cleared.

## Cross-cutting / minor

- **Files:** `core/website/app/components/footer/footer.tsx` (social icon links), `page-components/VolunteerForm.tsx`,
  `page-components/TicketForm.tsx`, `routes/_layout.agenda.$year.talk.$sessionId.tsx` (room-sponsor link)
  **WCAG:** 3.2.5 Change on Request (advisory, not a strict AA failure)
  **Description:** Several `target="_blank"` links (social icons, "Register as a Volunteer", the Tito fallback
  ticket link, room-sponsor logo links) don't indicate they open in a new tab, either visually or via accessible
  name (e.g. "Visit us on X (opens in a new tab)").
  **Suggested fix:** Low-effort, low-risk follow-up: append `(opens in a new tab)` to the relevant accessible
  names. Left out of this pass to avoid a mechanical sweep across unrelated components; worth doing as its own
  small PR.

- **Files:** `core/website/app/components/page-components/TicketForm.tsx`, `VolunteerForm.tsx`
  **Description:** Both mount third-party widgets (Tito, SalesMate) via injected `<script>` tags into an opaque
  container `<div>`. Their internal accessibility (focus management, labelling) is outside this codebase's
  control; not practical to fix here, but worth a spot-check with each vendor's own accessibility statement if one
  exists.

- **General:** No manual color-contrast audit was done against the theme token tables in
  `core/website/app/theme/` (light and dark palettes, including hover/focus/disabled state tokens) beyond what the
  automated axe `color-contrast` rule catches on the specific routes covered by `core/website/e2e/a11y.spec.ts`.
  Axe's contrast check only sees rendered, in-viewport text on the routes actually visited by the suite — it
  won't catch, for example, a low-contrast hover state that only appears on `:hover` (axe doesn't simulate hover),
  or contrast issues on routes/states not in the test list (empty states, error states, admin pages).
  **Suggested fix:** Either extend the e2e suite to force `:hover`/`:focus` states before scanning (Playwright can
  do this with `locator.hover()` before calling axe), or do a manual pass through
  `core/website/app/theme/tokens/colors.ts` and the per-fork theme files under `conference/theme/`.

## Test coverage gaps (for the e2e suite itself)

- The axe scan in `core/website/e2e/a11y.spec.ts` covers one route per public template (see
  `core/website/e2e/routes.ts`): home, `/about`, agenda, a talk detail page, sponsors, blog index and a blog
  post — the conference-scoped ones pinned to the 2025 fixture year. It runs under both the dark and light
  themes.
  Still **not** covered: `/voting` (see below), the sponsor portal, the speaker portal, or any admin route.
- **`/voting` is not covered at all, in either state.** Two separate reasons:
  1. The route has no year param, so it always reflects the *current* conference — an inherently moving target,
     unlike every other route in the suite, which is pinned to a past fixture year. Its rendered state changes
     as `talkVotingDates` pass and new years are added, so an assertion written today quietly stops meaning what
     it meant.
  2. The *live* flow (the part worth testing) needs both an in-window `talkVotingDates` **and** a live Sessionize
     `allSessionsEndpoint`. Unlike the agenda, there's no committed fixture path for it.

  `TalkOptionCard`'s keyboard/AT contract is covered by unit tests
  (`core/website/app/components/talk-option-card.test.tsx`) instead — which is why the earlier e2e attempt at
  this silently skipped on every run.

  **Partly addressed.** A dev-only date override now exists — an unsigned `__devDateOverride` cookie read only
  under `import.meta.env.DEV` (`app/lib/dates/dev-date-time-provider.server.ts`), dead-code-eliminated from
  production builds and tested to stay that way. `e2e/date-states.spec.ts` uses it to scan the CFP-open,
  voting-open and agenda-published homepage states, which previously required an admin login to reach.

  **Now closed.** Committed Sessionize fixtures (`e2e/fixtures/sessionize/`) are served by
  `e2e/start-dev-server.mjs`, so the live voting flow renders real comparison cards in tests. `e2e/voting.spec.ts`
  covers `TalkOptionCard` end-to-end — keyboard activation, focus indicator, the live region — which previously
  had unit tests only.
- The focus-visible check in `core/website/e2e/focus-visible.spec.ts` exercises the homepage header and the
  agenda's talk links (the densest interactive surface on the site, and a custom CSS grid rather than a real
  `<table>`). It's a spot-check, not exhaustive coverage of every interactive component (forms, admin controls,
  the mobile drawer, the multi-select filter dropdown on `/agenda`).

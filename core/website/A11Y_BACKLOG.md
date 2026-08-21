# Accessibility backlog

Tracked findings from the WCAG 2.1 AA audit (branch `a11y/audit-and-ci`) that were **not** fixed in that pass — either
out of scope for this pass, needing design/content input, or on lower-priority (admin/portal) pages. This file is
meant to be turned into a GitHub issue (or several) for follow-up; it is not itself a tracker.

Items are grouped by page/area, roughly in priority order (public-facing first). Each entry lists the file,
the relevant WCAG criterion/rule where known, a short description, and a suggested fix.

Fixes already made on this branch (landmarks, heading order, skip link, `TalkOptionCard` keyboard support, the
voting page live region, and jsx-a11y lint tightening) are **not** repeated here — see the branch's commit history
for those.

## Blog (`/blog`, `/blog/:slug`)

The blog index in particular is a known work-in-progress page — it renders as unstyled, unlabelled `<div>`/`<p>`
markup (no PandaCSS styling at all), unlike every other route in the app. The automated a11y e2e suite
(`core/website/e2e/a11y.spec.ts`) currently fails on `/blog` for exactly this reason; that failure is expected
until the page gets its real design.

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

- The axe scan in `core/website/e2e/a11y.spec.ts` currently covers: home, agenda, sponsors, blog index, voting,
  and one representative MDX content page (`/about`). It does **not** cover: individual blog posts
  (`/blog/:slug`), the talk detail page (`/agenda/:year/talk/:sessionId`), the sponsor portal, or any admin route.
  Extending the route list is the highest-leverage next step once the known `/blog` failures above are fixed —
  otherwise a real regression on an uncovered route would ship silently.
- The focus-visible check in `core/website/e2e/focus-visible.spec.ts` only exercises the homepage header and the
  voting page's option buttons. It's a spot-check, not exhaustive coverage of every interactive component (forms,
  admin controls, the mobile drawer, the multi-select filter dropdown on `/agenda`).

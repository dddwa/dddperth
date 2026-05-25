# New Year Setup Runbook

How to set up a new conference year in a fork repo. Run this annually as you roll over from the previous event.

All paths below are relative to the **fork** root (e.g. `dddperth/`). `core/` is the ddd-core subtree; `conference/` is the fork's own content.

## 1. Add a new year config file

Create `conference/config/years/<YEAR>.ts` (usually by copying the previous year).

Minimum required fields:

- `year`
- `conferenceDate`
- `sessionizeUrl` (for CFP submit links)
- `ticketReleases`
- `ticketInfo`
- `sponsors` (can be `{}` until sponsors are confirmed)

Date fields used by the website:

- `cfpDates.opens` and `cfpDates.closes`
- `ticketReleases[].range.opens` and `ticketReleases[].range.closes`
- `talkVotingDates.opens` and `talkVotingDates.closes`
- `agendaPublishedDateTime`
- `conferenceDate`

## 2. Register the new year globally

Update `conference/config/years-index.ts`:

- Import the new `conference<YEAR>` export
- Add it to the years array

Update `conference/manifest.ts`:

- Bump `currentConferenceYear` to the new year
- Update `volunteerForm.ticketUrl` to the new Tito year

## 3. Sessionize setup

`sessionizeUrl` (the public `https://sessionize.com/<conference>-<YEAR>` event page) drives the CFP submit button — safe to commit.

`sessions` drives the agenda + voting API integrations:

- `/agenda`
- `/voting`
- admin voting tools

The bare Sessionize API URL (`https://sessionize.com/api/v2/<event-id>`) **must be kept private** — it returns *all* submitted talks including unpublished ones, so leaking it pre-agenda-publish would let anyone read the unannounced lineup. For this reason, the current year's Sessionize endpoints are read from env at request time, not committed.

### a. Year config — declare the marker, no URLs

In `conference/config/years/<YEAR>.ts`, set `sessions` like this:

```ts
sessionizeUrl: 'https://sessionize.com/<conference>-<YEAR>',

// Endpoints are injected from env (SESSIONIZE_<YEAR>_SESSIONS / SESSIONIZE_<YEAR>_ALL_SESSIONS)
// by getYearConfig. Kept private because the unpublished agenda would otherwise leak.
sessions: {
    kind: 'sessionize',
    sessionizeEndpoint: undefined,
    allSessionsEndpoint: undefined,
    underrepresentedGroupsQuestionId: undefined, // set to the Sessionize question id once known
},
```

`getYearConfig(year, env)` (in `core/website/app/lib/conference-state.server.ts`) looks up `SESSIONIZE_<year>_SESSIONS` / `SESSIONIZE_<year>_ALL_SESSIONS` on the env and substitutes them into the returned `sessions` object. The year is in the var name on purpose — it forces the secret to be re-set each year so a stale value can't silently keep serving the old event's data.

The `_ALL_SESSIONS` endpoint is what voting and admin voting tools use — if it isn't set, voting routes return their "endpoint not configured" error.

### b. Rename the env-var typing

In `core/website/app/remix-app-load-context.ts` rename the previous year's entries to the new year:

```ts
// Sessionize endpoints
SESSIONIZE_<YEAR>_SESSIONS: string
SESSIONIZE_<YEAR>_ALL_SESSIONS?: string
```

This is a `core/` edit. It will surface as a one-time conflict on the next `/pull-upstream`, which resolves by re-applying your fork's year name. (When `ddd-core` ever makes this declarative — e.g. driven by `manifest.currentConferenceYear` — the conflict goes away.)

### c. Update `docs/deploy.md` if you have one

If your fork keeps a perth-style `docs/deploy.md` with the year baked in, update the `wrangler secret put` example lines for the new year.

### d. Set the secrets

For each environment (and locally in `website/.dev.vars`):

```bash
cd core/website
pnpm wrangler secret put SESSIONIZE_<YEAR>_SESSIONS --env staging
pnpm wrangler secret put SESSIONIZE_<YEAR>_SESSIONS --env production
pnpm wrangler secret put SESSIONIZE_<YEAR>_ALL_SESSIONS --env staging
pnpm wrangler secret put SESSIONIZE_<YEAR>_ALL_SESSIONS --env production
```

Values come from the Sessionize event admin page → API:

- `_SESSIONS` is the bare endpoint: `https://sessionize.com/api/v2/<event-id>`
- `_ALL_SESSIONS` appends the all-sessions view: `https://sessionize.com/api/v2/<event-id>/view/All`

### e. Cut over from the previous year

Once the new year's secrets are set in all environments, the previous year's API URLs become public (the agenda is published, sessions are no longer secret). To clean up:

1. Inline the previous year's URLs directly in its `<PREV>.ts` (so old `/agenda/<PREV>` pages keep working without a secret):

    ```ts
    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/<prev-event-id>',
        allSessionsEndpoint: 'https://sessionize.com/api/v2/<prev-event-id>/view/All',
        underrepresentedGroupsQuestionId: <id-or-undefined>,
    },
    ```

2. Remove the previous year's secrets from staging and production:

    ```bash
    pnpm wrangler secret delete SESSIONIZE_<PREV>_SESSIONS --env staging
    pnpm wrangler secret delete SESSIONIZE_<PREV>_SESSIONS --env production
    pnpm wrangler secret delete SESSIONIZE_<PREV>_ALL_SESSIONS --env staging
    pnpm wrangler secret delete SESSIONIZE_<PREV>_ALL_SESSIONS --env production
    ```

3. Remove the previous year's entries from `website/.dev.vars`.

### f. `underrepresentedGroupsQuestionId`

Found on the Sessionize event under Sessions → custom questions. Used to flag voting talks from underrepresented groups in admin reports. Leave as `undefined` if the question isn't configured for the year.

## 4. Content updates with year-specific copy

Check and update hardcoded year text in `conference/content/pages/`, especially:

- `venue.mdx`
- `team.mdx` title
- any page that explicitly mentions the previous year

## 5. Verification

Run at least:

```bash
pnpm exec tsc -b
```

Optional: run project lint/tests/build when environment variables are available.

```bash
pnpm build
pnpm lint
pnpm test
```

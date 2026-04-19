# New Year Setup Runbook

This runbook documents how to set up a new DDD Perth conference year in this repo.

## 1. Add a new year config file

Create `website/app/config/years/<YEAR>.server.ts` (usually by copying the previous year).

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

Update `website/app/config/conference-config.server.ts`:

- Import the new `conference<YEAR>` export
- Add it to `conferenceConfig.conferences`
- Update `volunteerForm.ticketUrl` to the new Tito year

## 3. Sessionize setup

`sessionizeUrl` drives the CFP submit button.

`sessions` drives agenda/voting API-backed pages:

- `/agenda`
- `/voting`
- admin voting tools

If Sessionize API endpoints are not ready yet, set `sessions: undefined` temporarily and add them later.

When ready, switch to:

- `sessions.kind = 'sessionize'`
- `sessions.sessionizeEndpoint`
- `sessions.allSessionsEndpoint`
- `sessions.underrepresentedGroupsQuestionId` (if used)

## 4. Content updates with year-specific copy

Check and update hardcoded year text in `website-content/pages`, especially:

- `venue.mdx`
- `team.mdx` title
- any page that explicitly mentions the previous year

## 5. Verification

Run at least:

```bash
pnpm exec tsc -p website/tsconfig.json --noEmit
```

Optional: run project lint/tests/build when environment variables are available.

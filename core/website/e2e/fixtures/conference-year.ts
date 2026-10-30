/**
 * A synthetic conference year, on the Sessionize fixtures' own day.
 *
 * Conference-day behaviour — feedback links that appear as each talk ends,
 * the feedback form's talk picker — only exists for the *current* conference
 * while its feedback window is open. Testing it against a real year's config
 * couples the suite to that year's dates: it passed in a fork whose
 * conference happened to fall on `FIXTURE_DATE` and failed in
 * conference-stub, whose current year is a "save the date" skeleton with no
 * agenda at all.
 *
 * A test opts in per browser context by setting `FIXTURE_CONFERENCE_COOKIE`;
 * the worker then sees this as the *only* conference, so it is current by
 * construction. Per context rather than suite-wide, because every other test
 * — and every visual baseline of `/` — should keep rendering the real current
 * conference. See `app/lib/e2e-fixture-conference.server.ts` for the guards.
 */
import type { ConferenceConfig, ConferenceYear, Year } from '@ddd/conference-config'
import { conferenceManifest } from '@conference/manifest'
import { conferenceTime } from '../../app/lib/dates/temporal'
import { FIXTURE_DATE } from './sessionize/model'

export const FIXTURE_CONFERENCE_COOKIE = '__e2eFixtureConference'

export const FIXTURE_YEAR = FIXTURE_DATE.slice(0, 4) as Year

const fixtureConference: ConferenceYear = {
    kind: 'conference',
    year: FIXTURE_YEAR,
    venue: undefined,
    sessionizeUrl: undefined,
    // Any sessionize.com URL is answered from the fixtures; the path segment
    // just has to carry Sessionize's `/view/<View>` shape after it.
    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/e2e-fixture-conference',
        allSessionsEndpoint: 'https://sessionize.com/api/v2/e2e-fixture-conference',
        underrepresentedGroupsQuestionId: undefined,
    },
    get conferenceDate() {
        return conferenceTime(`${FIXTURE_DATE}T08:00:00`)
    },
    get agendaPublishedDateTime() {
        return conferenceTime(`${FIXTURE_DATE}T08:00:00`).subtract({ weeks: 4 })
    },
    cfpDates: undefined,
    talkVotingDates: undefined,
    ticketReleases: [],
    get feedbackOpenUntilDateTime() {
        return conferenceTime(`${FIXTURE_DATE}T23:59:59`).add({ days: 1 })
    },
    ticketInfo: undefined,
    sponsors: {},
}

/** The real conference-wide settings, with the fixture as the only year. */
export const FIXTURE_CONFERENCES: ConferenceConfig = {
    ...conferenceManifest.conferences,
    conferences: { [FIXTURE_YEAR]: fixtureConference },
}

import type { RunsheetsConfig } from '@ddd/conference-config'
import { sponsorPortal } from './sponsor-portal.ts'

/**
 * The public volunteer run sheet at /runsheets, backed by DDD Perth's Jira
 * (dddperth.atlassian.net).
 *
 * Committee conventions this config relies on:
 *   - Each item on the day is a "Run Sheet Item" issue in the VOL project.
 *   - "Time Bracket" separates the conference day itself from bump-in,
 *     bump-out and the speaker dinner, so the page shows only the Saturday.
 *   - Volunteer teams and locations are Jira *labels*, not select fields, so
 *     they're free text on the board. The maps below name the ones the
 *     filter dropdown offers; an unmapped label still displays (falling back
 *     to the raw label) but can't be filtered on.
 *
 * The page is public and unauthenticated, so nothing here should reference a
 * field containing personal information — see the field allowlist in
 * core/website/app/lib/runsheets/runsheet-client.server.ts, which is what
 * keeps Jira's reporter/assignee data off the page.
 *
 * Field ids come from the VOL project's Run Sheet Item issue type — inspect
 * via the Jira admin UI or `GET /rest/api/3/issue/createmeta` if they change.
 */
export const runsheets: RunsheetsConfig = {
    jira: {
        baseUrl: 'https://dddperth.atlassian.net',
        jql: 'project = VOL AND type = "Run Sheet Item" AND "Time Bracket[Dropdown]" = "Saturday Conference"',
        fields: {
            roleInstructions: 'customfield_10131',
            team: 'customfield_10132',
            endTime: 'customfield_10133',
            startTime: 'customfield_10134',
            location: 'customfield_10135',
        },
    },

    teamLabels: {
        'team-1': 'Team 1',
        'team-2': 'Team 2',
        'team-3': 'Team 3',
        'team-4': 'Team 4',
        'team-5': 'Team 5',
        'team-6': 'Team 6',
        'team-7': 'Team 7',
        'team-photographers': 'Photographers',
        'team-room-coordinators': 'Room Coordinators',
        'team-Sat-Bump-Out': 'Bump Out',
        'team-Fri-Bump-In': 'Friday Bump In',
        'team-Sat-Bump-In': 'Saturday Bump In',
    },

    // Shown in place of the team name in the run sheet's Related column.
    teamIcons: {
        'team-1': '1️⃣',
        'team-2': '2️⃣',
        'team-3': '3️⃣',
        'team-4': '4️⃣',
        'team-5': '5️⃣',
        'team-6': '6️⃣',
        'team-7': '7️⃣',
        'team-photographers': '📷',
        'team-room-coordinators': '🎤',
    },

    // Optus Stadium room names, as labelled on the VOL board.
    locationLabels: {
        'loc-black-swan-room': 'Black Swan Room',
        'loc-champions-terrace': 'Champions Terrace',
        'loc-cygnet-room': 'Cygnet Room',
        'loc-help-desk': 'Help Desk Level 3',
        'loc-L2-Lobby': 'Lobby Level 2',
        'loc-L3-lobby': 'Lobby Level 3',
        'loc-platinum-terrace': 'Platinum Terrace',
        'loc-premiership-terrace': 'Premiership Terrace',
        'loc-registration-area': 'Registration Area',
        'loc-river-view-room-1': 'River View Room 1',
        'loc-river-view-room-2': 'River View Room 2',
        'loc-river-view-room-3': 'River View Room 3',
        'loc-sports-lounge': 'Sports Lounge',
    },

    // Room names as they appear on the Sessionize agenda.
    sessionizeRoomLocations: {
        'River Room 1 (Lv 3)': 'loc-river-view-room-1',
        'River Room 2 (Lv 3)': 'loc-river-view-room-2',
        'River Room 3 (Lv 3)': 'loc-river-view-room-3',
        'Cygnet room (Lv 2)': 'loc-cygnet-room',
        'Black Swan (Lv 2)': 'loc-black-swan-room',
    },

    // Plenum talks (the keynotes) fill all three River View Rooms with the
    // walls open. Service sessions take their locations from their
    // Sessionize description instead.
    plenumLocations: ['loc-river-view-room-1', 'loc-river-view-room-2', 'loc-river-view-room-3'],

    sessionTeam: 'session',

    speakerPronouns: { category: 'Your pronoun', withheldAnswers: ["I'd rather not answer"] },

    // /runsheets/bump-in. Exhibitor rows come straight from the SPN board, so
    // there's no need for a VOL ticket per sponsor — a VOL item like
    // "Exhibitor - BankWest" would show twice.
    bumpIn: {
        volunteerJql:
            'project = VOL AND type = "Run Sheet Item"' +
            ' AND "Time Bracket[Dropdown]" IN ("Friday Bump In", "Saturday Bump In")',
        sponsors: {
            // The portal's own JQL has a `{year}` template and also picks up
            // unlabelled issues; here only this year's labelled sponsors count.
            jql:
                `project = SPN AND issuetype = Sponsor AND labels = "${sponsorPortal.year}"` +
                ' AND labels NOT IN ("portal-test")',
            // PUBLIC FIELDS ONLY. Everything listed here is shown to anyone
            // with the link. Contacts, attendees, equipment, the summary (it
            // carries the deal value) and every URL field stay off this list.
            fields: {
                companyName: 'customfield_10087', // Company Name*
                tier: 'customfield_10086', // Level of Sponsorship*
                bumpInSlot: 'customfield_10153', // Bump In Day/Time Start
                underStadiumDropOff: 'customfield_10159', // Under Stadium Drop-off/Pick-up required?
                trolley: 'customfield_10160', // Do you require a Trolley/Forklift
                loadingDockAssistance: 'customfield_10161', // Loading Dock assistance required?
                porterAssistance: 'customfield_10157', // Optus Porter assistance required?
                exhibitorRoom: 'customfield_10303', // Exhibitor Room
                exhibitorSpaceNumber: 'customfield_10197', // Exhibitor Space Number
            },
            underStadiumBumpInOption: 'For Bump In',
            // Option values of "Bump In Day/Time Start", mirrored in
            // BUMP_IN_SLOTS (core/website/app/lib/sponsors/logistics.ts).
            // Conference is Saturday 3 October 2026.
            slots: {
                'Friday noon - 1pm': fri('12:00', '13:00'),
                'Friday 1pm - 2pm': fri('13:00', '14:00'),
                'Friday 2pm - 3pm': fri('14:00', '15:00'),
                'Friday 3pm - 4pm': fri('15:00', '16:00'),
                'Friday 4pm - 5pm': fri('16:00', '17:00'),
                'Friday 5pm - 6pm': fri('17:00', '18:00'),
                'Saturday 6.30am to 7am (minimal set-up only)': {
                    start: '2026-10-03T06:30:00+08:00',
                    end: '2026-10-03T07:00:00+08:00',
                    team: 'team-Sat-Bump-In',
                },
            },
            // Raw Jira tiers with a stand — same set as BOOTH_TIERS.
            exhibitingTiers: ['Platinum', 'Gold', 'Room', 'Community'],
        },
    },
}

function fri(start: string, end: string) {
    return { start: `2026-10-02T${start}:00+08:00`, end: `2026-10-02T${end}:00+08:00`, team: 'team-Fri-Bump-In' }
}

import type { RunsheetsConfig } from '@ddd/conference-config'

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
        'team-Sat-Bump-Out': 'Bump Out',
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
}

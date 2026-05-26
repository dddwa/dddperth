// Core conference-config: types and schema only. The data (years, sponsors,
// public config, socials) lives in the fork's /conference/ folder and is
// reached via the @conference/manifest path alias.

export type {
    CancelledConferenceYear,
    ConferenceConfig,
    ConferenceConfigYear,
    ConferenceVenue,
    ConferenceYear,
    DateTimeRange,
    SessionData,
    SessionizeConferenceSessions,
    Sponsor,
    TicketInfo,
    TicketRelease,
    TitoTicketInfo,
    VolunteerForm,
    Year,
    YearSponsors,
} from './types'

export type {
    Brand,
    ConferenceBuildManifest,
    ConferenceConfigPublic,
    ConferenceFeatures,
    ConferenceManifest,
    ContentPaths,
    DeploymentConfig,
    HomepageContentSlots,
    MobileApp,
    NavConfig,
    NavItem,
    Socials,
    ThemeRefs,
} from './manifest'

// Year keys are derived per-fork from its years map. Cast `keyof typeof
// conferenceManifest.conferences.conferences` at the use-site in the fork.

export {
    gridRoomSchema,
    gridSmartSchema,
    roomSchema,
    sessionSchema,
    timeSlotSchema,
} from './sessionize-schema'

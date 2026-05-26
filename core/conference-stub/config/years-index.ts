import type { ConferenceConfig } from '@ddd/conference-config'
import { conference2024 } from './years/2024'
import { conference2025 } from './years/2025'
import { conference2026 } from './years/2026'

// DevConf Example years. A real fork's years-index would list every year
// they've held the conference plus the next planned one.
export const conferenceConfig = {
    needVolunteers: true,

    conferences: {
        '2024': conference2024,
        '2025': conference2025,
        '2026': conference2026,
    },

    // No real volunteer form for the stub — set to `undefined` so the
    // "become a volunteer" CTA is hidden until a fork wires up a real form.
    volunteerForm: undefined,
} satisfies ConferenceConfig

export type ConferenceYears = keyof typeof conferenceConfig.conferences

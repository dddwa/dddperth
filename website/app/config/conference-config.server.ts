import type { ConferenceConfig } from '~/lib/config-types.server'
import { conference2018 } from './years/2018.server'
import { conference2019 } from './years/2019.server'
import { conference2021 } from './years/2021.server'
import { conference2022 } from './years/2022.server'
import { conference2023 } from './years/2023.server'
import { conference2024 } from './years/2024.server'
import { conference2025 } from './years/2025.server'

//
// If you update this, could you also update website-content/README.md
//

export const conferenceConfig = {
    needVolunteers: true,

    conferences: {
        '2018': conference2018,
        '2019': conference2019,
        '2021': conference2021,
        '2020': {
            kind: 'cancelled',
            year: '2020',
            cancelledMessage:
                'DDD Perth 2020 did not happen. The safety of all participants, from sponsors to speakers to attendees to volunteers, is our priority and we felt we could better serve our community by postponing the event.',
        },
        '2022': conference2022,
        '2023': conference2023,
        '2024': conference2024,
        '2025': conference2025,
    },

    volunteerForm: {
        type: 'tito',
        ticketUrl: 'https://ti.to/dddperth/2025/with/volunteer',
    },
} satisfies ConferenceConfig

export type ConferenceYears = keyof typeof conferenceConfig.conferences

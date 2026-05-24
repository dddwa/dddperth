import type { ConferenceConfig } from '@ddd/conference-config'
import { conference2015 } from './years/2015'
import { conference2016 } from './years/2016'
import { conference2017 } from './years/2017'
import { conference2018 } from './years/2018'
import { conference2019 } from './years/2019'
import { conference2021 } from './years/2021'
import { conference2022 } from './years/2022'
import { conference2023 } from './years/2023'
import { conference2024 } from './years/2024'
import { conference2025 } from './years/2025'
import { conference2026 } from './years/2026'

//
// If you update this, could you also update content/pages/README.md
//

export const conferenceConfig = {
    needVolunteers: true,

    conferences: {
        '2015': conference2015,
        '2016': conference2016,
        '2017': conference2017,
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
        '2026': conference2026,
    },

    volunteerForm: {
        type: 'tito',
        ticketUrl: 'https://ti.to/dddperth/2026/with/volunteer',
    },
} satisfies ConferenceConfig

export type ConferenceYears = keyof typeof conferenceConfig.conferences

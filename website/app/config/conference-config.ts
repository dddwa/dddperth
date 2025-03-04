import { ConferenceConfig } from '../lib/config-types'
import { conference2018 } from './years/2018'
import { conference2019 } from './years/2019'
import { conference2021 } from './years/2021'
import { conference2022 } from './years/2022'
import { conference2023 } from './years/2023'
import { conference2024 } from './years/2024'
import { conference2025 } from './years/2025'

//
// If you update this, could you also update website-content/README.md
//

export const conferenceConfig = {
    name: 'DDD Perth',

    description: 'DDD Perth is an inclusive non-profit conference for the Perth software community.',

    blogDescription: 'DDD Perth is an inclusive non-profit conference for the Perth software community.',

    timezone: 'Australia/Perth',

    needVolunteers: true,

    conferences: {
        '2018': conference2018,
        '2019': conference2019,
        '2021': conference2021,
        '2020': {
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
        type: 'salesmate',
        formId: 'e23713d2-8c3a-411b-b22c-2f8528b77c88',
        linkName: 'dddperth.salesmate.io',
    },
} satisfies ConferenceConfig

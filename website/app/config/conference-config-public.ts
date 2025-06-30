import type { ConferenceConfigPublic } from '~/lib/config-types-public'

//
// If you update this, could you also update website-content/README.md
//

export const conferenceConfigPublic = {
    name: 'DDD Perth',

    description: 'DDD Perth is an inclusive non-profit conference for the Perth software community.',

    blogDescription: 'DDD Perth is an inclusive non-profit conference for the Perth software community.',

    timezone: 'Australia/Perth',
} satisfies ConferenceConfigPublic

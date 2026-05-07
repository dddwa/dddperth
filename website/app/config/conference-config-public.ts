import type { ConferenceConfigPublic } from '~/lib/config-types-public'

//
// If you update this, could you also update website-content/README.md
//

export const conferenceConfigPublic = {
    name: 'DDD Adelaide',

    description: 'DDD Adelaide is an inclusive non-profit conference for the Adelaide software community.',

    blogDescription: 'DDD Adelaide is an inclusive non-profit conference for the Adelaide software community.',

    timezone: 'Australia/Adelaide',
} satisfies ConferenceConfigPublic

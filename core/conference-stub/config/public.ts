import type { ConferenceConfigPublic } from '@ddd/conference-config'

export const conferenceConfigPublic = {
    name: 'DevConf Example',

    description:
        'DevConf Example is a fictional conference shipped with ddd-core as a reference implementation of a /conference/ folder.',

    blogDescription:
        'DevConf Example is a fictional conference shipped with ddd-core as a reference implementation. Real forks replace this stub with their own /conference/.',

    timezone: 'Etc/UTC',

    features: {
        sponsorOverview: true,
    },
} satisfies ConferenceConfigPublic

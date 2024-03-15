import { conference2022 } from './years/2022'
import { conference2023 } from './years/2023'
import type { ConferenceYear } from './years/year-config'

//
// If you update this, could you also update website-content/README.md
//

/**
 * Conference configuration which doesn't necessarily change year on year
 */
export interface ConferenceConfig {
    name: string
    description: string

    blogDescription: string
    current: ConferenceYear

    previous: Record<`${number}${number}${number}${number}`, ConferenceYear>

    importantContacts: {
        police: {
            details: string
            phone: string
            mapUrl: string
        }
        centreAgainstSexualAssault: {
            Details: string
            Phone: string
        }
        emergencyMedical: {
            details: string
            mapUrl: string
        }
        nonEmergencyMedical: {
            details: string
            phone: string
            mapUrl: string
        }
    }

    socials: {
        twitter: {
            id: string
            name: string
        }
        facebook: string
        flickr: string
        youtube: string
        blog: string
        email: string
        mailingList: string
        gitHub: string
        instagram: string
        linkedin: string
    }
}

export const conferenceConfig = {
    name: 'DDD Perth',

    description: 'DDD Perth is an inclusive non-profit conference for the Perth software community.',

    blogDescription: 'DDD Perth is an inclusive non-profit conference for the Perth software community.',

    importantContacts: {
        police: {
            details: '2 Fitzgerald St, Northbridge WA 6003',
            phone: '(08) 9422 7111',
            mapUrl: 'https://www.google.com.au/maps/place/WA+Police/@-31.9539457,115.8571227,15z/data=!4m8!1m2!2m1!1swa+police!3m4!1s0x2a32bad2aad309a9:0x132b875b4c12ce8a!8m2!3d-31.9465398!4d115.852523',
        },
        centreAgainstSexualAssault: {
            Details: '24 hour line',
            Phone: '1800 806 292',
        },
        emergencyMedical: {
            details: 'Royal Perth Hospital, 197 Wellington St, Perth WA 6000',
            mapUrl: 'https://www.google.com.au/maps/place/Royal+Perth+Hospital/@-31.953946,115.8637156,17z/data=!3m1!4b1!4m5!3m4!1s0x2a32bb26d7818b2d:0x31db7aa443eb9c11!8m2!3d-31.953946!4d115.8659043',
        },
        nonEmergencyMedical: {
            details: 'Perth Medical Centre, 713 Hay St, Perth WA 6000',
            phone: '(08) 9481 4342',
            mapUrl: 'https://www.google.com.au/maps/place/Perth+Medical+Centre/@-31.9539771,115.8552714,17z/data=!3m1!4b1!4m5!3m4!1s0x2a32bad5d00fb27f:0xa93cc014867a5f8b!8m2!3d-31.9539771!4d115.8574654',
        },
    },

    socials: {
        twitter: {
            id: '977876011',
            name: 'DDDPerth',
        },
        facebook: 'DDDPerth',
        flickr: 'https://www.flickr.com/photos/135003652@N08/albums',
        youtube: 'https://www.youtube.com/channel/UCj4UnNYakbLAh2xTWTjeoAQ',
        blog: 'https://blog.dddperth.com/',
        email: 'info@dddperth.com',
        mailingList: 'http://eepurl.com/cRvaSf',
        gitHub: 'dddwa',
        instagram: 'dddperth',
        linkedin: 'ddd-wa-inc',
    },

    current: conference2023,

    previous: {
        '2022': conference2022,
    },
} satisfies ConferenceConfig

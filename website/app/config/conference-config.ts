import { conference2022 } from './years/2022'
import { conference2023 } from './years/2023'
import type { ConferenceYear } from './years/year-config'

/**
 * Conference configuration which doesn't necessarily change year on year
 */
export interface ConferenceConfig {
    name: string
    current: ConferenceYear

    previous: Record<string, ConferenceYear>
}

export const conferenceConfig = {
    name: 'DDD Perth',

    current: conference2023,

    previous: {
        '2022': conference2022,
    },
} satisfies ConferenceConfig

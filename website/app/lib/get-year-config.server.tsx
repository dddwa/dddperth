import { redirect } from 'react-router'
import { $path } from 'remix-routes'
import type { ConferenceYears } from '~/config/conference-config.server'
import { conferenceConfig } from '~/config/conference-config.server'

export function getYearConfig(year: string) {
    if (!isConferenceYear(year)) {
        throw redirect($path('/agenda/:year?', { year: undefined }))
    }

    return conferenceConfig.conferences[year]
}

export function isConferenceYear(year: string): year is ConferenceYears {
    return Object.keys(conferenceConfig.conferences).includes(year)
}

import { redirect } from 'react-router';
import { $path } from 'remix-routes'
import { conferenceConfig } from '~/config/conference-config'
import type { ConferenceConfigYear, ConferenceImportantInformation, Year } from '~/lib/config-types'
import { getImportantInformation } from '~/lib/get-important-information'

export function getYearConfig(year: Year, conference: ConferenceImportantInformation) {
    const yearConfigLookup = (conferenceConfig.conferences as Record<Year, ConferenceConfigYear | undefined>)[year]
    if (!yearConfigLookup || 'cancelledMessage' in yearConfigLookup) {
        throw redirect($path('/agenda/:year?', { year: undefined }))
    }

    const yearConfig: ConferenceImportantInformation = year ? getImportantInformation(yearConfigLookup) : conference
    return { yearConfig, yearConfigLookup }
}

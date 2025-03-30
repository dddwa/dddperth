import { redirect } from 'react-router'
import { $path } from 'remix-routes'
import { conferenceConfig } from '~/config/conference-config'
import type { ConferenceConfigYear, ConferenceImportantInformation, Year } from '~/lib/config-types'
import { getImportantInformation } from '~/lib/get-important-information'
import type { DateTimeProvider } from './dates/date-time-provider.server'

export function getYearConfig(
    year: Year,
    conference: ConferenceImportantInformation,
    dateTimeProvider: DateTimeProvider,
    allowCancelled: boolean = false,
) {
    const yearConfigLookup = (conferenceConfig.conferences as Record<Year, ConferenceConfigYear | undefined>)[year]
    const cancelled = yearConfigLookup && 'cancelledMessage' in yearConfigLookup

    // Default behaviour is to throw a redirect if the target year's conference did not exist *or* was cancelled.
    // Can suppress this behaviour and return the cancelledMessage instead by passing allowCancelled == true.
    if (!yearConfigLookup || (cancelled && !allowCancelled)) {
        throw redirect($path('/agenda/:year?', { year: undefined }))
    }

    const yearConfig: ConferenceImportantInformation =
        year && !cancelled ? getImportantInformation(yearConfigLookup, dateTimeProvider) : conference
    return { yearConfig, yearConfigLookup, cancelledMessage: cancelled && yearConfigLookup.cancelledMessage }
}

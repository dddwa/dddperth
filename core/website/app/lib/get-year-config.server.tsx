import { href, redirect } from 'react-router'
import type { ConferenceYears } from '@conference/manifest'
import type { ConferenceConfig } from '@ddd/conference-config'
import type { AppConfig } from '~/lib/services/app-config'
import { type ContextReader, getConferences, getConfig } from '~/remix-app-load-context'

/** A year's config as this request sees it — see `getConferences`. */
export function getYearConfig(context: ContextReader, year: string) {
    return resolveYearConfig(getConferences(context), year, getConfig(context))
}

/**
 * For code with no request to hand. Pass `conferenceManifest.conferences`
 * explicitly when the answer is about the real conference (e.g. the speaker
 * portal's year), not whatever an e2e test has swapped in.
 */
export function resolveYearConfig(conferences: ConferenceConfig, year: string, appConfig: AppConfig) {
    if (!isConferenceYear(conferences, year)) {
        throw redirect(href('/agenda/:year?', { year: undefined }))
    }

    const yearConfig = conferences.conferences[year]

    if (yearConfig.kind === 'conference' && yearConfig.sessions?.kind === 'sessionize') {
        const overrides = appConfig.sessionizeOverrides[year]
        if (overrides) {
            return {
                ...yearConfig,
                sessions: {
                    ...yearConfig.sessions,
                    sessionizeEndpoint:
                        overrides.sessionsEndpoint && overrides.sessionsEndpoint.length > 0
                            ? overrides.sessionsEndpoint
                            : yearConfig.sessions.sessionizeEndpoint,
                    allSessionsEndpoint:
                        overrides.allSessionsEndpoint && overrides.allSessionsEndpoint.length > 0
                            ? overrides.allSessionsEndpoint
                            : yearConfig.sessions.allSessionsEndpoint,
                },
            }
        }
    }

    return yearConfig
}

export function isConferenceYear(conferences: ConferenceConfig, year: string): year is ConferenceYears {
    return Object.keys(conferences.conferences).includes(year)
}

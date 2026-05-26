import { redirect } from 'react-router'
import { $path } from 'safe-routes'
import { conferenceManifest, type ConferenceYears } from '@conference/manifest'
import type { AppConfig } from '~/lib/services/app-config'

export function getYearConfig(year: string, appConfig?: AppConfig) {
    if (!isConferenceYear(year)) {
        throw redirect($path('/agenda/:year?', { year: undefined }))
    }

    const yearConfig = conferenceManifest.conferences.conferences[year]

    if (appConfig && yearConfig.kind === 'conference' && yearConfig.sessions?.kind === 'sessionize') {
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

export function isConferenceYear(year: string): year is ConferenceYears {
    return Object.keys(conferenceManifest.conferences.conferences).includes(year)
}

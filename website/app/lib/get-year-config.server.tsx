import { redirect } from 'react-router'
import { $path } from 'safe-routes'
import type { ConferenceYears } from '~/config/conference-config.server'
import { conferenceConfig } from '~/config/conference-config.server'
import type { CloudflareEnv } from '~/remix-app-load-context'

export function getYearConfig(year: string, env?: CloudflareEnv) {
    if (!isConferenceYear(year)) {
        throw redirect($path('/agenda/:year?', { year: undefined }))
    }

    const yearConfig = conferenceConfig.conferences[year]

    if (env && yearConfig.kind === 'conference' && yearConfig.sessions?.kind === 'sessionize') {
        const sessionsEnvKey = `SESSIONIZE_${year}_SESSIONS` as keyof CloudflareEnv
        const allSessionsEnvKey = `SESSIONIZE_${year}_ALL_SESSIONS` as keyof CloudflareEnv

        const sessionsFromEnv = env[sessionsEnvKey]
        const allSessionsFromEnv = env[allSessionsEnvKey]

        return {
            ...yearConfig,
            sessions: {
                ...yearConfig.sessions,
                sessionizeEndpoint:
                    typeof sessionsFromEnv === 'string' && sessionsFromEnv.length > 0
                        ? sessionsFromEnv
                        : yearConfig.sessions.sessionizeEndpoint,
                allSessionsEndpoint:
                    typeof allSessionsFromEnv === 'string' && allSessionsFromEnv.length > 0
                        ? allSessionsFromEnv
                        : yearConfig.sessions.allSessionsEndpoint,
            },
        }
    }

    return yearConfig
}

export function isConferenceYear(year: string): year is ConferenceYears {
    return Object.keys(conferenceConfig.conferences).includes(year)
}

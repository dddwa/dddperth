export interface SessionizeConferenceSessions {
    kind: 'sessionize'

    sessionizeEndpoint: string

    allSessionsEndpoint: string | undefined
}

export interface SessionData {
    kind: 'session-data'

    // TODO
    sessions: unknown
}

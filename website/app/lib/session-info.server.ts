export interface SessionizeConferenceSessions {
    kind: 'sessionize'

    sessionizeEndpoint: string

    allSessionsEndpoint: string | undefined

    underrepresentedGroupsQuestionId: number | undefined
}

export interface SessionData {
    kind: 'session-data'

    // TODO
    sessions: unknown
}

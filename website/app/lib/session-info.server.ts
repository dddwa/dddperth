export interface SessionizeConferenceSessions {
    kind: 'sessionize'

    sessionizeEndpoint: string | undefined

    allSessionsEndpoint: string | undefined

    underrepresentedGroupsQuestionId: number | undefined
}

export interface SessionData {
    kind: 'session-data'

    // TODO
    sessions: unknown
}

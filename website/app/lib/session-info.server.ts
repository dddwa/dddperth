import type { z } from 'zod'
import type { gridSmartSchema } from './sessionize.server'

export interface SessionizeConferenceSessions {
    kind: 'sessionize'

    sessionizeEndpoint: string | undefined

    allSessionsEndpoint: string | undefined

    underrepresentedGroupsQuestionId: number | undefined
}

export interface SessionData {
    kind: 'session-data'

    sessions: z.infer<typeof gridSmartSchema>
}

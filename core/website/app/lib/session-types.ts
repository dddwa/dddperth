export interface User {
    email: string
    name: string | null
}

export interface AuthSessionData {
    /** Opaque server-side session id; the row lives in the auth_sessions D1 table. */
    sessionId?: string
}

export type SessionId = string

export interface VotingStorageData {
    sessionId?: SessionId
}

export interface AdminDateTimeSessionData {
    adminDateOverride?: string
}

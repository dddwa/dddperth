export interface User {
    id: string
    login: string
    avatarUrl: string
    name: string | null
    email: string | null
}

export interface AuthSessionData {
    user?: User
}

export type SessionId = string

export interface VotingStorageData {
    sessionId?: SessionId
}

export interface AdminDateTimeSessionData {
    adminDateOverride?: string
}

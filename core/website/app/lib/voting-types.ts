import type { CURRENT_SESSION_VERSION, CURRENT_VOTE_VERSION } from './voting-version-constants'

export interface TalkPair {
    index: number
    roundNumber: number
    left: TalkVotingData
    right: TalkVotingData
}

export interface TalkVotingData {
    id: string
    title: string
    description: string | null
    tags: string[]
}

export interface VotingPairs {
    sessionId: string
    year: string
    pairs: TalkPair[]
    createdAt: string
}

export interface VotingGlobal {
    year: string
    numberSessions: number
}

export type VoteIndex = number

export type SessionId = string

export interface BaseVoteRecord {
    sessionId: SessionId
    vote: 'A' | 'B' | 'S' // A = talk1, B = talk2, S = skipped
    timestamp: string
}

// Current vote record format - round-based with indexInRound
export interface VoteRecord extends BaseVoteRecord {
    voteVersion: typeof CURRENT_VOTE_VERSION
    roundNumber: number
    indexInRound: number
}

export interface VotingSession {
    sessionId: SessionId
    seed: number
    totalPairs: number
    inputSessionizeTalkIdsJson: string // JSON string of talk IDs
    currentIndex: VoteIndex
    createdAt: string
    version: typeof CURRENT_SESSION_VERSION
    roundNumber: number
    maxPairsPerRound: number
}

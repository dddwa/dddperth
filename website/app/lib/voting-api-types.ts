// Shared types for voting API responses to ensure type safety between server and client

import type { TalkPair } from './voting.server'

// Success response from getCurrentVotingBatch
export interface VotingBatchData {
    pairs: TalkPair[]
    currentIndex: number
    hasMore: boolean
}

// Success response from /api/voting/batch
export interface VotingBatchResponse {
    batch: VotingBatchData
    sessionId: string
    votingState: string
}

// Error responses
export interface VotingErrorResponse {
    error: string
    needsSession?: boolean
    state?: 'not-open-yet' | 'closed'
}

// Union type for all possible API responses
export type VotingApiResponse = VotingBatchResponse | VotingErrorResponse

// Type guard functions
export function isVotingBatchResponse(response: VotingApiResponse): response is VotingBatchResponse {
    return 'batch' in response && 'sessionId' in response
}

export function isVotingErrorResponse(response: VotingApiResponse): response is VotingErrorResponse {
    return 'error' in response
}

// Vote API types
export interface VoteRequest {
    vote: 'A' | 'B' | 'skip'
    voteIndex: number
}

export interface VoteSuccessResponse {
    success: true
    voteIndex: number
}

export interface VoteErrorResponse {
    error: string
    duplicate?: boolean
}

export type VoteApiResponse = VoteSuccessResponse | VoteErrorResponse

// Type guard functions for vote responses
export function isVoteSuccessResponse(response: VoteApiResponse): response is VoteSuccessResponse {
    return 'success' in response && response.success === true
}

export function isVoteErrorResponse(response: VoteApiResponse): response is VoteErrorResponse {
    return 'error' in response
}
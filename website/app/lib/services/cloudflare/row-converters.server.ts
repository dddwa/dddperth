import type { VoteRow, VotingSessionRow } from '../../d1.server'
import type { VoteRecord, VotingSession } from '../../voting-types'
import { CURRENT_SESSION_VERSION, CURRENT_VOTE_VERSION } from '../../voting-version-constants'

export function rowToVotingSession(row: VotingSessionRow): VotingSession {
    if (row.version !== CURRENT_SESSION_VERSION) {
        throw new Error(`Unsupported voting session version: ${row.version}`)
    }

    return {
        sessionId: row.session_id,
        seed: row.seed,
        totalPairs: row.total_pairs,
        inputSessionizeTalkIdsJson: row.input_sessionize_talk_ids_json,
        currentIndex: row.current_index,
        createdAt: row.created_at,
        version: CURRENT_SESSION_VERSION,
        roundNumber: row.round_number,
        maxPairsPerRound: row.max_pairs_per_round,
    }
}

export function rowToVoteRecord(row: VoteRow): VoteRecord {
    return {
        voteVersion: CURRENT_VOTE_VERSION,
        sessionId: row.session_id,
        roundNumber: row.round_number,
        indexInRound: row.index_in_round,
        vote: row.vote,
        timestamp: row.created_at,
    }
}

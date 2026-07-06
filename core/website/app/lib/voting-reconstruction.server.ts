import { FairPairingGeneratorV5 } from './pairing-generator-v5'
import type { TalkPair, TalkVotingData, VoteRecord, VotingSession } from './voting-types'

export interface MappedVoteRecord {
    originalVoteRecord: VoteRecord
    pair: TalkPair
    vote: 'A' | 'B' | 'S' // A = talk1, B = talk2, S = skipped
    timestamp: string
    roundNumber: number
}

export function batchReconstructVoteContexts(votes: VoteRecord[], session: VotingSession, talks: TalkVotingData[]) {
    const mappedVotes: MappedVoteRecord[] = []
    const voteGroups = groupVotesByRound(votes)

    for (const group of voteGroups) {
        processVoteGroup(group, talks, session, mappedVotes)
    }

    return mappedVotes
}

interface GroupedVoteRecords {
    roundNumber: number
    votes: VoteRecord[]
}

function processVoteGroup(
    group: GroupedVoteRecords,
    talks: TalkVotingData[],
    session: VotingSession,
    mappedVotes: MappedVoteRecord[],
) {
    if (talks.length === 0) {
        throw new Error(`Cannot process vote group: no talks available for round ${group.roundNumber}`)
    }

    if (group.votes.length === 0) {
        return
    }

    const roundGenerator = new FairPairingGeneratorV5(talks.length, session.seed, group.roundNumber)
    const maxPosition = Math.max(...group.votes.map((vote) => vote.indexInRound))
    const pairIndices = roundGenerator.getPairs(0, maxPosition + 1)

    for (const vote of group.votes) {
        const pairData = pairIndices.find((pair) => pair.position === vote.indexInRound)
        if (!pairData) {
            const availablePositions = pairIndices.map((pair) => pair.position).sort((a, b) => a - b)
            const allVotePositions = group.votes.map((currentVote) => currentVote.indexInRound).sort((a, b) => a - b)
            throw new Error(
                `V5 vote mapping failed: cannot find pair at position ${vote.indexInRound} in round ${group.roundNumber}. ` +
                    `Generator produced ${pairIndices.length} pairs at positions [${availablePositions.join(', ')}]. ` +
                    `All votes in this round are at positions [${allVotePositions.join(', ')}]. ` +
                    `Session: ${session.sessionId}, Seed: ${session.seed}, Talks: ${talks.length}`,
            )
        }

        const [leftIndex, rightIndex] = pairData.pair
        if (leftIndex >= talks.length || rightIndex >= talks.length) {
            throw new Error(
                `V5 vote mapping failed: talk index out of bounds (${leftIndex}, ${rightIndex}) for ${talks.length} talks, session=${session.sessionId}`,
            )
        }

        mappedVotes.push({
            originalVoteRecord: vote,
            pair: {
                index: vote.indexInRound,
                roundNumber: group.roundNumber,
                left: talks[leftIndex],
                right: talks[rightIndex],
            },
            vote: vote.vote,
            timestamp: vote.timestamp,
            roundNumber: group.roundNumber,
        })
    }
}

export function groupVotesByRound(votes: VoteRecord[]) {
    const groupsMap = new Map<number, GroupedVoteRecords>()

    for (const vote of votes) {
        if (!groupsMap.has(vote.roundNumber)) {
            groupsMap.set(vote.roundNumber, { roundNumber: vote.roundNumber, votes: [] })
        }

        groupsMap.get(vote.roundNumber)?.votes.push(vote)
    }

    return Array.from(groupsMap.values())
}

export function sortVotesChronologically(votes: MappedVoteRecord[]): MappedVoteRecord[] {
    return votes.sort((a, b) => {
        if (a.roundNumber !== b.roundNumber) {
            return a.roundNumber - b.roundNumber
        }

        return a.originalVoteRecord.indexInRound - b.originalVoteRecord.indexInRound
    })
}

export function removeVotesOnDuplicatedTalksInRound(mappedVotes: MappedVoteRecord[]): MappedVoteRecord[] {
    const sortedVotes = sortVotesChronologically(mappedVotes)
    const seenPairs = new Map<number, Set<string>>()
    const cleanedVotes: MappedVoteRecord[] = []

    for (const vote of sortedVotes) {
        const roundNumber = vote.pair.roundNumber
        if (!seenPairs.has(roundNumber)) {
            seenPairs.set(roundNumber, new Set())
        }

        const roundSet = seenPairs.get(roundNumber)
        if (!roundSet) {
            throw new Error(`Failed to initialize seen-pair tracking for round ${roundNumber}`)
        }

        if (!roundSet.has(vote.pair.left.id) && !roundSet.has(vote.pair.right.id)) {
            roundSet.add(vote.pair.left.id)
            roundSet.add(vote.pair.right.id)
            cleanedVotes.push(vote)
        }
    }

    return cleanedVotes
}

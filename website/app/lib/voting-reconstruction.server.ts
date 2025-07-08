import { trace } from '@opentelemetry/api'
import { FairPairingGeneratorV2 } from './pairing-generator-v2'
import { FairPairingGeneratorV3 } from './pairing-generator-v3'
import { FairPairingGeneratorV4 } from './pairing-generator-v4'
import { FairPairingGeneratorV1 } from './pairing.generator-v1'
import type { TalkPair, TalkVotingData, VoteRecord, VotingSession } from './voting.server'

export interface MappedVoteRecord {
    originalVoteRecord: VoteRecord
    pair: TalkPair
    vote: 'A' | 'B' | 'S' // A = talk1, B = talk2, S = skipped
    timestamp: string
    roundNumber: number
}

// Explicit mapping between session version and algorithm version
export function getAlgorithmVersionFromSession(session: VotingSession): number {
    if (session.version === undefined) {
        return 1 // V1 sessions had no version field
    }
    if (session.version === 2) {
        return 2 // V2 sessions used algorithm v2
    }
    if (session.version === 3) {
        return 3 // V3 sessions used algorithm v3
    }
    if (session.version === 4) {
        return 4 // V4 sessions used algorithm v4
    }

    // @ts-expect-error exhaustive check
    throw new Error(`Unknown session version: ${session.version}`)
}

export function batchReconstructVoteContexts(votes: VoteRecord[], session: VotingSession, talks: TalkVotingData[]) {
    return trace.getTracer('default').startActiveSpan('batchReconstructVoteContexts', (span) => {
        try {
            const mappedVotes: MappedVoteRecord[] = []

            // Group votes by algorithm version and round
            const voteGroups = groupVotesByAlgorithmAndRound(votes, session)

            for (const group of voteGroups) {
                processVoteGroup(group, talks, session, mappedVotes)
            }

            return mappedVotes
        } finally {
            span.end()
        }
    })
}

interface GroupedVoteRecords {
    algorithmVersion: number
    roundNumber: number
    votes: VoteRecord[]
}

function processVoteGroup(
    group: GroupedVoteRecords,
    talks: TalkVotingData[],
    session: VotingSession,
    mappedVotes: MappedVoteRecord[],
) {
    return trace.getTracer('default').startActiveSpan(
        'processVoteGroup',
        {
            attributes: {
                'vote.group.algorithmVersion': group.algorithmVersion,
                'vote.group.roundNumber': group.roundNumber,
                'vote.group.voteCount': group.votes.length,
                'talks.count': talks.length,
            },
        },
        (span) => {
            try {
                // Early validation
                if (talks.length === 0) {
                    throw new Error(
                        `Cannot process vote group: no talks available for algorithm V${group.algorithmVersion} round ${group.roundNumber}`,
                    )
                }
                if (group.votes.length === 0) {
                    return // Nothing to process, but not an error
                }

                if (group.algorithmVersion === 1) {
                    // V1: Each vote has a direct voteIndex, use simple generator
                    const generator = new FairPairingGeneratorV1(talks.length, session.seed)
                    for (const vote of group.votes) {
                        if (vote.voteVersion === undefined) {
                            // V1 votes are VoteRecordLegacy which have voteIndex
                            const legacyVote = vote
                            const pair = generator.getPairAtPosition(legacyVote.voteIndex)
                            if (!pair) {
                                throw new Error(
                                    `V1 vote mapping failed: cannot get pair at position ${legacyVote.voteIndex} for vote ${vote.rowKey}`,
                                )
                            }
                            const [leftIndex, rightIndex] = pair
                            if (leftIndex >= talks.length || rightIndex >= talks.length) {
                                throw new Error(
                                    `V1 vote mapping failed: talk index out of bounds (${leftIndex}, ${rightIndex}) for ${talks.length} talks, vote ${vote.rowKey}`,
                                )
                            }
                            mappedVotes.push({
                                originalVoteRecord: vote,
                                pair: {
                                    index: legacyVote.voteIndex,
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
                } else if (group.algorithmVersion === 2) {
                    // V2: Exhaustive pairs, direct index lookup
                    const generator = new FairPairingGeneratorV2(talks.length, session.seed)
                    for (const vote of group.votes) {
                        if (vote.voteVersion === undefined) {
                            // V2 votes are VoteRecordLegacy which have voteIndex
                            const legacyVote = vote
                            const pairs = generator.getNextPairs(legacyVote.voteIndex, 1)
                            if (pairs.length === 0) {
                                throw new Error(
                                    `V2 vote mapping failed: cannot get pair at index ${legacyVote.voteIndex} for vote ${vote.rowKey}`,
                                )
                            }
                            const [leftIndex, rightIndex] = pairs[0]
                            if (leftIndex >= talks.length || rightIndex >= talks.length) {
                                throw new Error(
                                    `V2 vote mapping failed: talk index out of bounds (${leftIndex}, ${rightIndex}) for ${talks.length} talks, vote ${vote.rowKey}`,
                                )
                            }
                            mappedVotes.push({
                                originalVoteRecord: vote,
                                pair: {
                                    index: legacyVote.voteIndex,
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
                } else if (group.algorithmVersion === 3) {
                    // V3: Round-based with indexing bug - must generate pairs individually due to conflict skipping
                    const roundSeed = FairPairingGeneratorV3.generateRoundSeed(session.seed, group.roundNumber)
                    const roundGenerator = new FairPairingGeneratorV3(talks.length, roundSeed)

                    const v2Votes = group.votes.filter((v) => v.voteVersion !== undefined)

                    if (v2Votes.length === 0) {
                        if (group.votes.length !== 0) {
                            throw new Error(`V3 vote mapping failed: votes wrong version for session ${session.rowKey}`)
                        }

                        return
                    }

                    // V3 BUG: getPairs() skips positions due to conflict avoidance, so we must reconstruct
                    // the exact sequence that was generated during live voting by calling getPairs() for each position
                    for (const vote of v2Votes) {
                        const voteIndex = vote.indexInRound
                        
                        // Generate pairs from 0 to voteIndex+1 to get the pair that was actually at this position
                        const pairsGenerated = roundGenerator.getPairs(0, voteIndex + 1)
                        
                        if (voteIndex >= pairsGenerated.length) {
                            throw new Error(
                                `V3 vote mapping failed: vote index ${voteIndex} exceeds generated pairs (${pairsGenerated.length}) for vote ${vote.rowKey} in round ${group.roundNumber}. ` +
                                `V3 has conflict avoidance that skips positions.`,
                            )
                        }
                        
                        const [leftIndex, rightIndex] = pairsGenerated[voteIndex]
                        if (leftIndex >= talks.length || rightIndex >= talks.length) {
                            throw new Error(
                                `V3 vote mapping failed: talk index out of bounds (${leftIndex}, ${rightIndex}) for ${talks.length} talks, vote ${vote.rowKey}`,
                            )
                        }
                        mappedVotes.push({
                            originalVoteRecord: vote,
                            pair: {
                                index: voteIndex,
                                roundNumber: group.roundNumber,
                                left: talks[leftIndex],
                                right: talks[rightIndex],
                            },
                            vote: vote.vote,
                            timestamp: vote.timestamp,
                            roundNumber: group.roundNumber,
                        })
                    }
                } else if (group.algorithmVersion === 4) {
                    // V4: Round-based with fixed indexing - batch generate pairs for this round
                    const roundSeed = FairPairingGeneratorV4.generateRoundSeed(session.seed, group.roundNumber)
                    const roundGenerator = new FairPairingGeneratorV4(talks.length, roundSeed)
                    const v2Votes = group.votes.filter((v) => v.voteVersion !== undefined)

                    // Find max position needed for this round
                    if (v2Votes.length === 0) {
                        if (group.votes.length !== 0) {
                            throw new Error(`V4 vote mapping failed: votes wrong version for session ${session.rowKey}`)
                        }

                        return
                    }
                    const maxPosition = Math.max(...v2Votes.map((v) => v.indexInRound))

                    const pairIndices = roundGenerator.getPairs(0, maxPosition + 1)

                    // Add debugging info
                    span.setAttributes({
                        'v4.maxPosition': maxPosition,
                        'v4.generatedPairs': pairIndices.length,
                        'v4.pairPositions': pairIndices.map(p => p.position).join(','),
                        'v4.votePositions': v2Votes.map(v => v.indexInRound).join(','),
                    })

                    // Map each vote to its corresponding pair
                    for (const vote of v2Votes) {
                        const voteIndex = vote.indexInRound
                        const pairData = pairIndices.find((p) => p.position === voteIndex)
                        if (!pairData) {
                            // Enhanced error with debugging info
                            const availablePositions = pairIndices.map(p => p.position).sort((a, b) => a - b)
                            const allVotePositions = v2Votes.map(v => v.indexInRound).sort((a, b) => a - b)
                            throw new Error(
                                `V4 vote mapping failed: cannot find pair at position ${voteIndex} for vote ${vote.rowKey} in round ${group.roundNumber}. ` +
                                `Generator produced ${pairIndices.length} pairs at positions [${availablePositions.join(', ')}]. ` +
                                `All votes in this round are at positions [${allVotePositions.join(', ')}]. ` +
                                `Session: ${session.sessionId}, Seed: ${session.seed}, Talks: ${talks.length}`,
                            )
                        }
                        const [leftIndex, rightIndex] = pairData.pair
                        if (leftIndex >= talks.length || rightIndex >= talks.length) {
                            throw new Error(
                                `V4 vote mapping failed: talk index out of bounds (${leftIndex}, ${rightIndex}) for ${talks.length} talks, vote ${vote.rowKey}`,
                            )
                        }
                        mappedVotes.push({
                            originalVoteRecord: vote,
                            pair: {
                                index: voteIndex,
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
            } finally {
                span.end()
            }
        },
    )
}

/**
 * Groups votes by algorithm version and round for efficient ELO calculation
 * NOTE: algorithmVersion should come from the session, not individual votes
 */
export function groupVotesByAlgorithmAndRound(votes: VoteRecord[], session: VotingSession) {
    const groupsMap = new Map<string, GroupedVoteRecords>()
    const algorithmVersion = getAlgorithmVersionFromSession(session)

    for (const vote of votes) {
        // Use voteVersion discriminator to determine round number
        const roundNumber = vote.voteVersion === undefined ? 0 : vote.roundNumber
        const key = `${algorithmVersion}_${roundNumber}`

        if (!groupsMap.has(key)) {
            groupsMap.set(key, { algorithmVersion, roundNumber, votes: [] })
        }

        groupsMap.get(key)?.votes.push(vote)
    }

    return Array.from(groupsMap.values())
}

/**
 * Sorts votes within a group chronologically for accurate ELO progression
 */
export function sortVotesChronologically(votes: MappedVoteRecord[]): MappedVoteRecord[] {
    return votes.sort((a, b) => {
        // Use voteVersion discriminator to determine how to sort
        if (a.originalVoteRecord.voteVersion === undefined && b.originalVoteRecord.voteVersion === undefined) {
            // Legacy votes: sort by voteIndex
            return a.originalVoteRecord.voteIndex - b.originalVoteRecord.voteIndex
        }

        if (a.originalVoteRecord.voteVersion === 2 && b.originalVoteRecord.voteVersion === 2) {
            // V2 votes: sort by indexInRound
            return a.originalVoteRecord.indexInRound - b.originalVoteRecord.indexInRound
        }

        // Mixed vote types - shouldn't happen but handle gracefully
        // Fall back to timestamp comparison
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })
}

export function removeVotesOnDuplicatedTalksInRound(mappedVotes: MappedVoteRecord[]): MappedVoteRecord[] {
    // Sort V2 votes chronologically to ensure we keep the first occurrence
    const sortedV2Votes = sortVotesChronologically(mappedVotes)

    // Lookup to round and seen talk ids in that round
    const seenPairs = new Map<number, Set<string>>()
    const cleanedV2Votes: MappedVoteRecord[] = []

    for (const vote of sortedV2Votes) {
        const roundNumber = vote.pair.roundNumber
        if (!seenPairs.has(roundNumber)) {
            seenPairs.set(roundNumber, new Set())
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const roundSet = seenPairs.get(roundNumber)!

        if (!roundSet.has(vote.pair.left.id) && !roundSet.has(vote.pair.right.id)) {
            roundSet.add(vote.pair.left.id)
            roundSet.add(vote.pair.right.id)
            cleanedV2Votes.push(vote)
        } else {
            // Skip duplicate vote
        }
    }

    return cleanedV2Votes
}

# Voting System Redesign - Detailed Implementation Plan

## **Overview**

Transform the current exhaustive pair generation system into a round-based approach that limits pairs per round while maintaining seamless user experience and stateless storage.

## **Core Changes**

### **1. Data Model Updates**

#### **VotingSession Interface** (voting.server.ts:58)

```typescript
export interface VotingSession {
    // ... existing fields
    algorithmVersion: number // NEW: track algorithm for reconstruction
    roundNumber: number // NEW: current round (starts at 0)
    maxPairsPerRound: number // NEW: calculated from talk count
}
```

#### **VoteRecord Interface** (voting.server.ts:46)

```typescript
export interface VoteRecord {
    // ... existing fields
    algorithmVersion: number // NEW: algorithm used for this vote
    roundNumber: number // NEW: which round this vote belongs to
    indexInRound: number // NEW: position within the round (0-based)
    // Remove: voteIndex (replaced by roundNumber + indexInRound)
}
```

### **2. Pairing Generator Changes**

#### **New Round-Based Generator** (pairing-generator-v2.ts)

```typescript
export class FairPairingGenerator {
    private maxPairsPerRound: number

    constructor(totalTalks: number, seed: number, algorithmVersion = 2) {
        // ... existing initialization
        this.maxPairsPerRound = Math.floor(totalTalks / 2)
    }

    // NEW: Get pairs for a specific round
    getRoundPairs(roundNumber: number, startIndex: number, count: number): Array<[number, number]> {
        const roundSeed = this.generateRoundSeed(this.seed, roundNumber)
        const roundGenerator = new FairPairingGenerator(this.totalTalks, roundSeed)
        return roundGenerator.getNextPairs(startIndex, count)
    }

    // NEW: Deterministic round seed generation
    private generateRoundSeed(originalSeed: number, roundNumber: number): number {
        // Simple hash function - could use crypto.subtle for production
        return ((originalSeed + roundNumber) * 1664525 + 1013904223) % 4294967296
    }

    getMaxPairsPerRound(): number {
        return this.maxPairsPerRound
    }
}
```

### **3. Server Logic Updates**

#### **Session Creation** (voting.server.ts:250)

```typescript
export async function createUserVotingSessionAndRedirect(
    request: Request,
    votesTableClient: TableClient,
    currentSessions: TalkVotingData[],
): Promise<void> {
    // ... existing logic

    const maxPairsPerRound = Math.floor(currentSessions.length / 2)

    const sessionRecord: VotingSession = {
        // ... existing fields
        algorithmVersion: 3, // NEW: bump version for round-based
        roundNumber: 0, // NEW: start at round 0
        maxPairsPerRound, // NEW: store for reference
        version: 3, // Update schema version
    }
    // ... rest of creation logic
}
```

#### **Batch Generation** (voting.server.ts:297)

```typescript
export async function getCurrentVotingBatch(
    request: Request,
    currentSessions: TalkVotingData[],
    votingSession: VotingSession,
    batchSize = 50,
    fromIndex?: number,
): Promise<{ pairs: TalkPair[]; currentIndex: number; newRound?: boolean }> {
    // ... existing validation

    const generator = new FairPairingGenerator(
        currentSessions.length,
        votingSession.seed,
        votingSession.algorithmVersion,
    )

    const startIndex = fromIndex ?? votingSession.currentIndex
    const maxPairsThisRound = votingSession.maxPairsPerRound

    // Check if we need to start a new round
    if (startIndex >= maxPairsThisRound) {
        const newRoundNumber = votingSession.roundNumber + 1
        const newRoundSeed = generator.generateRoundSeed(votingSession.seed, newRoundNumber)

        // Update session for new round
        const updatedSession: Partial<VotingSession> = {
            partitionKey: votingSession.partitionKey,
            rowKey: votingSession.rowKey,
            roundNumber: newRoundNumber,
            currentIndex: 0,
        }
        await votesTableClient.updateEntity(updatedSession, 'Merge')

        // Generate pairs from new round
        const newGenerator = new FairPairingGenerator(
            currentSessions.length,
            newRoundSeed,
            votingSession.algorithmVersion,
        )
        const pairIndices = newGenerator.getNextPairs(0, Math.min(batchSize, maxPairsThisRound))

        return {
            pairs: convertIndicesToPairs(pairIndices, currentSessions, 0),
            currentIndex: pairIndices.length,
            newRound: true, // Signal to client (though they won't act on it)
        }
    }

    // Normal batch generation within current round
    const remainingInRound = maxPairsThisRound - startIndex
    const pairsToFetch = Math.min(batchSize, remainingInRound)

    const roundSeed = generator.generateRoundSeed(votingSession.seed, votingSession.roundNumber)
    const roundGenerator = new FairPairingGenerator(currentSessions.length, roundSeed, votingSession.algorithmVersion)
    const pairIndices = roundGenerator.getNextPairs(startIndex, pairsToFetch)

    return {
        pairs: convertIndicesToPairs(pairIndices, currentSessions, startIndex),
        currentIndex: startIndex + pairIndices.length,
        newRound: false,
    }
}
```

#### **Vote Recording** (voting.server.ts:171)

```typescript
export async function recordVoteInTable(
    votesTableClient: TableClient,
    sessionId: SessionId,
    votingSession: VotingSession,
    indexInRound: number, // NEW: index within current round
    vote: 'A' | 'B' | 'skip',
): Promise<void> {
    const voteChar = vote === 'skip' ? 'S' : vote

    const voteRecord: VoteRecord = {
        partitionKey: `session_${sessionId}`,
        rowKey: `vote_${votingSession.roundNumber}_${indexInRound}`, // NEW: composite key
        algorithmVersion: votingSession.algorithmVersion, // NEW
        roundNumber: votingSession.roundNumber, // NEW
        indexInRound, // NEW
        vote: voteChar,
        timestamp: new Date().toISOString(),
    }

    await votesTableClient.createEntity(voteRecord)

    // Update session's current index
    const updatedSession: Partial<VotingSession> = {
        partitionKey: votingSession.partitionKey,
        rowKey: votingSession.rowKey,
        currentIndex: indexInRound + 1,
    }
    await votesTableClient.updateEntity(updatedSession, 'Merge')
}
```

### **4. Client-Side Changes**

#### **Frontend Logic** (\_layout.voting.tsx:105)

```typescript
// Remove hard refresh logic - server handles transitions seamlessly
useEffect(() => {
    const remainingInBatch = pairs.length - currentPairIndex
    // Remove the > 0 condition for smoother transitions
    if (remainingInBatch <= 10 && !nextBatchFetchedRef.current && !fetchingRef.current) {
        void fetchNextBatch()
    }
}, [currentPairIndex, pairs.length])

// Update vote handling to pass round context
async function handleVote(vote: 'A' | 'B' | 'skip') {
    const currentPair = pairs[currentPairIndex]
    if (!currentPair) return

    setVoteSubmitted(vote)

    const formData = new FormData()
    formData.append('vote', vote)
    formData.append('indexInRound', currentPair.indexInRound.toString()) // NEW

    // ... rest of vote submission
}
```

#### **API Response Updates** (voting-api-types.ts)

```typescript
export interface VotingBatchResponse {
    batch: {
        pairs: TalkPair[]
        currentIndex: number
        newRound: boolean // NEW: indicate round transition (informational)
    }
    sessionId: string
    votingState: string
}
```

### **5. Migration Strategy**

## **ELO Calculation Considerations**

### **Vote Reconstruction Process**

```typescript
interface EloCalculator {
    async calculateTalkRatings(sessionIds: string[]): Promise<Map<string, number>> {
        const allVotes = await this.getAllVotes(sessionIds)

        // Group votes by algorithm version and round for processing
        const voteGroups = this.groupVotesByAlgorithmAndRound(allVotes)

        const ratings = new Map<string, number>()

        for (const [groupKey, votes] of voteGroups) {
            const [algorithmVersion, roundNumber] = this.parseGroupKey(groupKey)

            // Process each group as independent pairing sequence
            await this.processVoteGroup(votes, algorithmVersion, roundNumber, ratings)
        }

        return ratings
    }

    private groupVotesByAlgorithmAndRound(votes: VoteRecord[]): Map<string, VoteRecord[]> {
        const groups = new Map<string, VoteRecord[]>()

        for (const vote of votes) {
            const key = `${vote.algorithmVersion}_${vote.roundNumber}`
            if (!groups.has(key)) {
                groups.set(key, [])
            }
            groups.get(key)!.push(vote)
        }

        return groups
    }

    private async processVoteGroup(
        votes: VoteRecord[],
        algorithmVersion: number,
        roundNumber: number,
        ratings: Map<string, number>
    ) {
        // Get original session to reconstruct generator
        const session = await this.getSessionForVotes(votes[0])
        const talks = await this.getTalksForSession(session)

        // Reconstruct the pairing sequence for this group
        const generator = new FairPairingGenerator(talks.length, session.seed, algorithmVersion)
        const roundSeed = generator.generateRoundSeed(session.seed, roundNumber)
        const roundGenerator = new FairPairingGenerator(talks.length, roundSeed, algorithmVersion)

        // Process votes in chronological order
        votes.sort((a, b) => a.indexInRound - b.indexInRound)

        for (const vote of votes) {
            if (vote.vote === 'S') continue // Skip votes don't affect ELO

            const [talk1Index, talk2Index] = roundGenerator.getNextPairs(vote.indexInRound, 1)[0]
            const talk1 = talks[talk1Index]
            const talk2 = talks[talk2Index]

            const winner = vote.vote === 'A' ? talk1 : talk2
            const loser = vote.vote === 'A' ? talk2 : talk1

            // Apply ELO update
            this.updateEloRatings(winner.id, loser.id, ratings)
        }
    }

    private updateEloRatings(winnerId: string, loserId: string, ratings: Map<string, number>) {
        const K = 32 // ELO K-factor
        const winnerRating = ratings.get(winnerId) ?? 1200
        const loserRating = ratings.get(loserId) ?? 1200

        const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400))
        const expectedLoser = 1 - expectedWinner

        const newWinnerRating = winnerRating + K * (1 - expectedWinner)
        const newLoserRating = loserRating + K * (0 - expectedLoser)

        ratings.set(winnerId, newWinnerRating)
        ratings.set(loserId, newLoserRating)
    }
}
```

### **Key ELO Considerations**

1. **Vote Order**: Process votes within each group chronologically to maintain ELO accuracy
2. **Skip Handling**: Skip votes don't affect ratings but maintain sequence integrity
3. **Cross-Round Consistency**: Each algorithm version maintains its own rating progression
4. **Initial Ratings**: All talks start at 1200 ELO (or other baseline)
5. **K-Factor Tuning**: May need adjustment based on total vote volume per talk

### **Performance Optimizations**

1. **Batch Processing**: Process votes in chunks to manage memory
2. **Caching**: Cache reconstructed generators for repeated calculations
3. **Indexing**: Add database indexes on `algorithmVersion` and `roundNumber`
4. **Parallel Processing**: Process different algorithm groups in parallel

## **Implementation Steps**

1. **Phase 1: Data Model Updates**

    - Update `VotingSession` and `VoteRecord` interfaces
    - Add migration logic for existing sessions
    - Test backward compatibility

2. **Phase 2: Generator Updates**

    - Implement round-based pairing in `FairPairingGenerator`
    - Add deterministic seed generation
    - Test pair generation consistency

3. **Phase 3: Server Logic**

    - Update batch generation logic
    - Implement seamless round transitions
    - Update vote recording with new fields

4. **Phase 4: Client Updates**

    - Remove hard refresh logic
    - Update vote submission format
    - Test smooth transitions

5. **Phase 5: ELO Implementation**
    - Implement vote reconstruction logic
    - Build ELO calculation system
    - Add performance optimizations

This plan maintains the stateless storage benefits while creating a much more user-friendly voting experience and robust ELO calculation foundation.

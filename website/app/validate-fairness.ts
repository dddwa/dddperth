import { FairPairingGeneratorV3 } from './lib/pairing-generator-v3'

export function hasDuplicateTalks(pairs: Array<[number, number]>): boolean {
    const seenTalks = new Set<number>()

    for (const [talk1, talk2] of pairs) {
        if (seenTalks.has(talk1) || seenTalks.has(talk2)) {
            return true
        }
        seenTalks.add(talk1)
        seenTalks.add(talk2)
    }

    return false
}

export function findDuplicateTalks(pairs: Array<[number, number]>): number[] {
    const seenTalks = new Set<number>()
    const duplicates = new Set<number>()

    for (const [talk1, talk2] of pairs) {
        if (seenTalks.has(talk1)) {
            duplicates.add(talk1)
        }
        if (seenTalks.has(talk2)) {
            duplicates.add(talk2)
        }
        seenTalks.add(talk1)
        seenTalks.add(talk2)
    }

    return Array.from(duplicates)
}

// Keep the old functions for backward compatibility
export function hasDuplicatePairs(pairs: Array<[number, number]>): boolean {
    const seen = new Set<string>()

    for (const [talk1, talk2] of pairs) {
        const pairKey = `${Math.min(talk1, talk2)}-${Math.max(talk1, talk2)}`
        if (seen.has(pairKey)) {
            return true
        }
        seen.add(pairKey)
    }

    return false
}

export function findDuplicatePairs(pairs: Array<[number, number]>): string[] {
    const seen = new Set<string>()
    const duplicates: string[] = []

    for (const [talk1, talk2] of pairs) {
        const pairKey = `${Math.min(talk1, talk2)}-${Math.max(talk1, talk2)}`
        if (seen.has(pairKey)) {
            duplicates.push(pairKey)
        } else {
            seen.add(pairKey)
        }
    }

    return duplicates
}

interface FairnessReport {
    talksCount: number
    sessionsCount: number
    pairsPerSession: number
    talkAppearances: number[]
    pairCoverage: Map<string, number>
    statistics: {
        minAppearances: number
        maxAppearances: number
        avgAppearances: number
        stdDeviation: number
        coefficientOfVariation: number
        uniquePairsShown: number
        pairCoveragePercent: number
    }
    duplicateAnalysis: {
        hasDuplicates: boolean
        duplicateCount: number
        duplicateTalks: string[]
        duplicatesBySession: Map<number, string[]>
    }
}

export function validateFairness(talksCount = 250, sessionsCount = 1000, pairsPerSession = 50): FairnessReport {
    const talkAppearances = new Array(talksCount).fill(0)
    const pairsSeen = new Map<string, number>() // "talk1-talk2" -> count
    const totalPossiblePairs = (talksCount * (talksCount - 1)) / 2 // All possible unique pairs
    const maxPairsPerRound = Math.floor(talksCount / 2) // V3 limit: pairs per round
    const actualPairsPerSession = Math.min(pairsPerSession, maxPairsPerRound)

    // Track talk usage within sessions (should never have duplicates with new algorithm)
    const duplicatesBySession = new Map<number, string[]>()
    let totalDuplicateCount = 0

    console.log(`\nValidating fairness for (V3 Algorithm):`)
    console.log(`- ${talksCount} talks`)
    console.log(`- ${sessionsCount} sessions`)
    console.log(`- ${actualPairsPerSession} pairs per session (max per round: ${maxPairsPerRound})`)
    console.log(`- Each talk appears at most once per round`)
    console.log(`- Round-based generation with seed progression`)
    console.log(`\nSimulating...\n`)

    // Simulate multiple sessions
    for (let session = 0; session < sessionsCount; session++) {
        // Random seed for this session
        const seed = Math.floor(Math.random() * 2147483647)
        const generator = new FairPairingGeneratorV3(talksCount, seed)

        // Track talks within this session to verify no duplicates within rounds
        const sessionTalks = new Set<number>()
        const sessionDuplicates: string[] = []
        let sessionPairs: Array<[number, number]> = []

        // V3 simulates round-based voting - user might go through multiple rounds
        let pairsCollected = 0
        let currentRound = 0
        
        while (pairsCollected < actualPairsPerSession) {
            // Generate round seed for this round
            const roundSeed = generator.generateRoundSeed(seed, currentRound)
            const roundGenerator = new FairPairingGeneratorV3(talksCount, roundSeed)
            
            // Get pairs for this round (up to maxPairsPerRound)
            const pairsNeeded = Math.min(actualPairsPerSession - pairsCollected, maxPairsPerRound)
            const roundPairs = roundGenerator.getPairs(0, pairsNeeded)
            
            // Track talks within this round (no duplicates allowed within round)
            const roundTalks = new Set<number>()
            
            for (const [talk1, talk2] of roundPairs) {
                // Check for duplicate talks within this round (should never happen in V3)
                if (roundTalks.has(talk1) || roundTalks.has(talk2)) {
                    const dupTalk = roundTalks.has(talk1) ? talk1 : talk2
                    sessionDuplicates.push(`talk-${dupTalk}-round-${currentRound}`)
                    totalDuplicateCount++
                }
                
                roundTalks.add(talk1)
                roundTalks.add(talk2)
                sessionTalks.add(talk1)
                sessionTalks.add(talk2)
                
                sessionPairs.push([talk1, talk2])
                pairsCollected++
            }
            
            currentRound++
            
            // Safety check to prevent infinite loops
            if (currentRound > 10) {
                console.warn(`Session ${session}: Too many rounds, breaking at ${currentRound}`)
                break
            }
        }

        // Process all collected pairs for this session
        for (const [talk1, talk2] of sessionPairs) {

            // Track appearances
            talkAppearances[talk1]++
            talkAppearances[talk2]++

            // Track unique pairs across all sessions
            const pairKey = `${Math.min(talk1, talk2)}-${Math.max(talk1, talk2)}`
            pairsSeen.set(pairKey, (pairsSeen.get(pairKey) || 0) + 1)
        }

        // Record session duplicates if any (should be none)
        if (sessionDuplicates.length > 0) {
            duplicatesBySession.set(session, sessionDuplicates)
        }

        if ((session + 1) % 100 === 0) {
            console.log(`Processed ${session + 1} sessions...`)
        }
    }

    // Calculate statistics
    const avgAppearances = talkAppearances.reduce((a, b) => a + b) / talksCount
    const variance = talkAppearances.reduce((sum, count) => sum + Math.pow(count - avgAppearances, 2), 0) / talksCount
    const stdDeviation = Math.sqrt(variance)

    // Gather all duplicate pairs
    const allDuplicatePairs = new Set<string>()
    for (const duplicates of duplicatesBySession.values()) {
        for (const pair of duplicates) {
            allDuplicatePairs.add(pair)
        }
    }

    const report: FairnessReport = {
        talksCount,
        sessionsCount,
        pairsPerSession,
        talkAppearances,
        pairCoverage: pairsSeen,
        statistics: {
            minAppearances: Math.min(...talkAppearances),
            maxAppearances: Math.max(...talkAppearances),
            avgAppearances,
            stdDeviation,
            coefficientOfVariation: (stdDeviation / avgAppearances) * 100,
            uniquePairsShown: pairsSeen.size,
            pairCoveragePercent: (pairsSeen.size / totalPossiblePairs) * 100,
        },
        duplicateAnalysis: {
            hasDuplicates: totalDuplicateCount > 0,
            duplicateCount: totalDuplicateCount,
            duplicateTalks: Array.from(allDuplicatePairs),
            duplicatesBySession,
        },
    }

    return report
}

export function printFairnessReport(report: FairnessReport): void {
    const stats = report.statistics

    console.log(`\n${'='.repeat(60)}`)
    console.log(`FAIRNESS ANALYSIS REPORT`)
    console.log(`${'='.repeat(60)}\n`)

    console.log(`Talk Appearance Distribution:`)
    console.log(`- Minimum appearances: ${stats.minAppearances}`)
    console.log(`- Maximum appearances: ${stats.maxAppearances}`)
    console.log(`- Average appearances: ${stats.avgAppearances.toFixed(2)}`)
    console.log(`- Standard deviation: ${stats.stdDeviation.toFixed(2)}`)
    console.log(`- Coefficient of variation: ${stats.coefficientOfVariation.toFixed(2)}%`)

    console.log(`\nPair Coverage:`)
    console.log(`- Unique pairs shown: ${stats.uniquePairsShown.toLocaleString()}`)
    console.log(`- Coverage percentage: ${stats.pairCoveragePercent.toFixed(2)}%`)

    // Distribution histogram
    console.log(`\nAppearance Distribution:`)
    const bucketSize = 5
    const histogram = new Map<number, number>()

    report.talkAppearances.forEach((count) => {
        const bucket = Math.floor(count / bucketSize) * bucketSize
        histogram.set(bucket, (histogram.get(bucket) || 0) + 1)
    })

    const sortedBuckets = Array.from(histogram.keys()).sort((a, b) => a - b)
    sortedBuckets.forEach((bucket) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const count = histogram.get(bucket)!
        const bar = '█'.repeat(Math.round(count / 5))
        console.log(
            `  ${bucket.toString().padStart(3)}-${(bucket + bucketSize - 1).toString().padEnd(3)}: ${bar} (${count} talks)`,
        )
    })

    // Check for systematic bias
    console.log(`\nBias Analysis:`)
    const firstQuarter = report.talkAppearances.slice(0, report.talksCount / 4)
    const lastQuarter = report.talkAppearances.slice(-report.talksCount / 4)
    const firstQuarterAvg = firstQuarter.reduce((a, b) => a + b) / firstQuarter.length
    const lastQuarterAvg = lastQuarter.reduce((a, b) => a + b) / lastQuarter.length

    console.log(`- First 25% of talks avg: ${firstQuarterAvg.toFixed(2)}`)
    console.log(`- Last 25% of talks avg: ${lastQuarterAvg.toFixed(2)}`)
    console.log(`- Position bias: ${Math.abs(firstQuarterAvg - lastQuarterAvg).toFixed(2)}`)

    // Most/least seen pairs
    const pairCounts = Array.from(report.pairCoverage.entries()).sort((a, b) => b[1] - a[1])

    console.log(`\nMost frequently shown pairs:`)
    pairCounts.slice(0, 5).forEach(([pair, count]) => {
        console.log(`  ${pair}: ${count} times`)
    })

    // Duplicate analysis
    console.log(`\nTalk Repetition Analysis:`)
    if (report.duplicateAnalysis.hasDuplicates) {
        console.log(`- ⚠️  TALK REPETITION DETECTED: ${report.duplicateAnalysis.duplicateCount} duplicate talks found`)
        console.log(`- Sessions with duplicates: ${report.duplicateAnalysis.duplicatesBySession.size}`)
        console.log(`- This should never happen with the new algorithm!`)

        if (report.duplicateAnalysis.duplicatesBySession.size > 0) {
            console.log(`\nFirst 5 sessions with duplicates:`)
            const sessionEntries = Array.from(report.duplicateAnalysis.duplicatesBySession.entries()).slice(0, 5)
            sessionEntries.forEach(([sessionId, duplicates]) => {
                console.log(`  Session ${sessionId}: ${duplicates.join(', ')}`)
            })
        }
    } else {
        console.log(`- ✅ No talk repetition - each talk appears at most once per session`)
    }

    console.log(`\n${'='.repeat(60)}\n`)
}

// Run the validation
// Test different scenarios
const scenarios = [
    { talks: 250, sessions: 1000, pairsPerSession: 50 },
    { talks: 250, sessions: 1000, pairsPerSession: 100 },
    { talks: 250, sessions: 2000, pairsPerSession: 50 },
]

// Run tsx validate-fairness.ts to run the validation
scenarios.forEach(({ talks, sessions, pairsPerSession }) => {
    const report = validateFairness(talks, sessions, pairsPerSession)
    printFairnessReport(report)
})

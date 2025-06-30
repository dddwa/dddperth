import { FairPairingGenerator } from './lib/pairing-generator'

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
}

export function validateFairness(talksCount = 250, sessionsCount = 1000, pairsPerSession = 50): FairnessReport {
    const talkAppearances = new Array(talksCount).fill(0)
    const pairsSeen = new Map<string, number>() // "talk1-talk2" -> count
    const totalPossiblePairs = (talksCount * (talksCount - 1)) / 2

    console.log(`\nValidating fairness for:`)
    console.log(`- ${talksCount} talks`)
    console.log(`- ${sessionsCount} sessions`)
    console.log(`- ${pairsPerSession} pairs per session`)
    console.log(`- ${totalPossiblePairs} total possible pairs`)
    console.log(`\nSimulating...\n`)

    // Simulate multiple sessions
    for (let session = 0; session < sessionsCount; session++) {
        // Random seed for this session
        const seed = Math.floor(Math.random() * 2147483647)
        const generator = new FairPairingGenerator(talksCount, seed)

        // Get pairs for this session
        for (let i = 0; i < pairsPerSession && i < totalPossiblePairs; i++) {
            const pair = generator.getPairAtPosition(i)
            if (!pair) continue

            const [talk1, talk2] = pair

            // Track appearances
            talkAppearances[talk1]++
            talkAppearances[talk2]++

            // Track unique pairs
            const pairKey = `${Math.min(talk1, talk2)}-${Math.max(talk1, talk2)}`
            pairsSeen.set(pairKey, (pairsSeen.get(pairKey) || 0) + 1)
        }

        if ((session + 1) % 100 === 0) {
            console.log(`Processed ${session + 1} sessions...`)
        }
    }

    // Calculate statistics
    const avgAppearances = talkAppearances.reduce((a, b) => a + b) / talksCount
    const variance = talkAppearances.reduce((sum, count) => sum + Math.pow(count - avgAppearances, 2), 0) / talksCount
    const stdDeviation = Math.sqrt(variance)

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

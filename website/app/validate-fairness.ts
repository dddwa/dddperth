import { pathToFileURL } from 'node:url'
import { FairPairingGeneratorV4 } from './lib/pairing-generator-v4'
import { FairPairingGeneratorV5 } from './lib/pairing-generator-v5'

type Pair = [number, number]
export type AlgorithmVersion = 'v4' | 'v5'

interface PairingAlgorithm {
    version: AlgorithmVersion
    label: string
    getRoundPairs: (talksCount: number, sessionSeed: number, roundNumber: number) => Pair[]
}

export interface SessionPlan {
    profile: string
    requestedPairs: number
}

export interface ValidationScenario {
    name: string
    talksCount: number
    sessionsCount: number
    sessionPlans?: SessionPlan[]
}

export interface SessionProfileSummary {
    profile: string
    sessions: number
    minRequestedPairs: number
    maxRequestedPairs: number
    avgRequestedPairs: number
}

export interface DistributionStats {
    min: number
    max: number
    avg: number
    stdDeviation: number
    coefficientOfVariation: number
    gini: number
}

export interface PairCoverageStats extends DistributionStats {
    totalPossiblePairs: number
    uniquePairsShown: number
    coveragePercent: number
}

export interface SideBalanceStats {
    maxTalkImbalance: number
    avgTalkImbalance: number
    talksLeaningLeft: number
    talksLeaningRight: number
    balancedTalks: number
}

export interface DuplicateAnalysis {
    duplicateTalksWithinRound: number
    roundsWithDuplicateTalks: number
    duplicatePairsWithinSession: number
    sessionsWithDuplicatePairs: number
    repeatedTalksWithinSession: number
    sessionsWithRepeatedTalks: number
    examples: Array<{
        session: number
        issue: string
        values: string[]
    }>
}

export interface ValidationChecks {
    talkExposureFair: boolean
    noDuplicateTalksWithinRound: boolean
    noDuplicatePairsWithinSession: boolean
}

export interface FairnessReport {
    version: AlgorithmVersion
    label: string
    scenarioName: string
    talksCount: number
    sessionsCount: number
    maxPairsPerRound: number
    totalPairsShown: number
    sessionProfiles: SessionProfileSummary[]
    talkAppearances: number[]
    pairCoverage: Map<string, number>
    statistics: {
        talkAppearances: DistributionStats
        pairFrequencies: PairCoverageStats
        sideBalance: SideBalanceStats
    }
    duplicateAnalysis: DuplicateAnalysis
    checks: ValidationChecks
}

const algorithms: PairingAlgorithm[] = [
    {
        version: 'v4',
        label: 'V4 greedy shuffled conflict-free rounds',
        getRoundPairs: (talksCount, sessionSeed, roundNumber) => {
            const roundSeed = FairPairingGeneratorV4.generateRoundSeed(sessionSeed, roundNumber)
            const generator = new FairPairingGeneratorV4(talksCount, roundSeed)
            return generator.getPairs(0, generator.getTotalPairs()).map(({ pair }) => pair)
        },
    },
    {
        version: 'v5',
        label: 'V5 round-robin scheduled rounds',
        getRoundPairs: (talksCount, sessionSeed, roundNumber) => {
            const generator = new FairPairingGeneratorV5(talksCount, sessionSeed, roundNumber)
            return generator.getPairs(0, generator.getTotalPairs()).map(({ pair }) => pair)
        },
    },
]

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

export function hasDuplicatePairs(pairs: Array<[number, number]>): boolean {
    const seen = new Set<string>()

    for (const [talk1, talk2] of pairs) {
        const pairKey = getPairKey(talk1, talk2)
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
        const pairKey = getPairKey(talk1, talk2)
        if (seen.has(pairKey)) {
            duplicates.push(pairKey)
        } else {
            seen.add(pairKey)
        }
    }

    return duplicates
}

export function createFixedSessionPlans(sessionsCount: number, requestedPairs: number): SessionPlan[] {
    return Array.from({ length: sessionsCount }, () => ({
        profile: `${requestedPairs} pairs`,
        requestedPairs,
    }))
}

export function createMixedSessionPlans(talksCount: number, sessionsCount: number): SessionPlan[] {
    const maxPairsPerRound = Math.floor(talksCount / 2)
    const shortPartialPairs = Math.max(1, Math.floor(maxPairsPerRound * 0.2))
    const halfRoundPairs = Math.max(1, Math.floor(maxPairsPerRound * 0.5))
    const oneRoundPairs = maxPairsPerRound
    const onePlusPartialPairs = maxPairsPerRound + Math.max(1, Math.floor(maxPairsPerRound * 0.35))
    const twoRoundPairs = maxPairsPerRound * 2

    return Array.from({ length: sessionsCount }, (_, sessionIndex) => {
        const bucket = mix32(sessionIndex + 0x51ed270b) % 100

        if (bucket < 25) {
            return {
                profile: 'short partial',
                requestedPairs: shortPartialPairs,
            }
        }

        if (bucket < 60) {
            return {
                profile: 'half round',
                requestedPairs: halfRoundPairs,
            }
        }

        if (bucket < 85) {
            return {
                profile: 'one round',
                requestedPairs: oneRoundPairs,
            }
        }

        if (bucket < 97) {
            return {
                profile: 'one plus partial',
                requestedPairs: onePlusPartialPairs,
            }
        }

        return {
            profile: 'two rounds',
            requestedPairs: twoRoundPairs,
        }
    })
}

export function validateFairnessForVersion(
    version: AlgorithmVersion,
    scenario: ValidationScenario,
): FairnessReport {
    const algorithm = algorithms.find((candidate) => candidate.version === version)

    if (algorithm === undefined) {
        throw new Error(`Unsupported pairing algorithm version: ${version}`)
    }

    const sessionPlans = scenario.sessionPlans ?? createMixedSessionPlans(scenario.talksCount, scenario.sessionsCount)
    const talkAppearances = new Array(scenario.talksCount).fill(0)
    const leftAppearances = new Array(scenario.talksCount).fill(0)
    const rightAppearances = new Array(scenario.talksCount).fill(0)
    const pairCoverage = new Map<string, number>()
    const maxPairsPerRound = Math.floor(scenario.talksCount / 2)
    const examples: DuplicateAnalysis['examples'] = []

    let totalPairsShown = 0
    let duplicateTalksWithinRound = 0
    let roundsWithDuplicateTalks = 0
    let duplicatePairsWithinSession = 0
    let sessionsWithDuplicatePairs = 0
    let repeatedTalksWithinSession = 0
    let sessionsWithRepeatedTalks = 0

    sessionPlans.forEach((plan, sessionIndex) => {
        const sessionSeed = sessionIndex + 1
        const sessionPairs = getSessionPairs(algorithm, scenario.talksCount, sessionSeed, plan.requestedPairs)
        const pairsByRound = new Map<number, Pair[]>()
        const allSessionPairs = sessionPairs.map(({ pair }) => pair)
        const duplicatePairs = findDuplicatePairs(allSessionPairs)
        const repeatedTalks = countRepeatedTalkOccurrences(allSessionPairs)

        if (duplicatePairs.length > 0) {
            duplicatePairsWithinSession += duplicatePairs.length
            sessionsWithDuplicatePairs++
            addExample(examples, sessionIndex, 'duplicate pairs in one user session', duplicatePairs)
        }

        if (repeatedTalks > 0) {
            repeatedTalksWithinSession += repeatedTalks
            sessionsWithRepeatedTalks++
        }

        for (const { pair, roundNumber } of sessionPairs) {
            const [talk1, talk2] = pair

            totalPairsShown++
            talkAppearances[talk1]++
            talkAppearances[talk2]++
            leftAppearances[talk1]++
            rightAppearances[talk2]++

            const pairKey = getPairKey(talk1, talk2)
            pairCoverage.set(pairKey, (pairCoverage.get(pairKey) ?? 0) + 1)

            const existingRoundPairs = pairsByRound.get(roundNumber)
            if (existingRoundPairs === undefined) {
                pairsByRound.set(roundNumber, [pair])
            } else {
                existingRoundPairs.push(pair)
            }
        }

        for (const [roundNumber, roundPairs] of pairsByRound) {
            const duplicateTalks = findDuplicateTalks(roundPairs)

            if (duplicateTalks.length > 0) {
                duplicateTalksWithinRound += duplicateTalks.length
                roundsWithDuplicateTalks++
                addExample(
                    examples,
                    sessionIndex,
                    `duplicate talks in round ${roundNumber}`,
                    duplicateTalks.map((talk) => `talk-${talk}`),
                )
            }
        }
    })

    const talkStats = calculateDistributionStats(talkAppearances)
    const pairFrequencyStats = calculatePairCoverageStats(scenario.talksCount, pairCoverage)
    const sideBalance = calculateSideBalanceStats(leftAppearances, rightAppearances)

    return {
        version,
        label: algorithm.label,
        scenarioName: scenario.name,
        talksCount: scenario.talksCount,
        sessionsCount: scenario.sessionsCount,
        maxPairsPerRound,
        totalPairsShown,
        sessionProfiles: summarizeSessionPlans(sessionPlans),
        talkAppearances,
        pairCoverage,
        statistics: {
            talkAppearances: talkStats,
            pairFrequencies: pairFrequencyStats,
            sideBalance,
        },
        duplicateAnalysis: {
            duplicateTalksWithinRound,
            roundsWithDuplicateTalks,
            duplicatePairsWithinSession,
            sessionsWithDuplicatePairs,
            repeatedTalksWithinSession,
            sessionsWithRepeatedTalks,
            examples,
        },
        checks: {
            talkExposureFair: talkStats.coefficientOfVariation <= 5,
            noDuplicateTalksWithinRound: duplicateTalksWithinRound === 0,
            noDuplicatePairsWithinSession: duplicatePairsWithinSession === 0,
        },
    }
}

export function validateAllVersions(scenario: ValidationScenario): FairnessReport[] {
    return algorithms.map((algorithm) => validateFairnessForVersion(algorithm.version, scenario))
}

export function validateFairness(
    talksCount = 250,
    sessionsCount = 1000,
    pairsPerSession = 50,
    version: AlgorithmVersion = 'v5',
): FairnessReport {
    return validateFairnessForVersion(version, {
        name: `${pairsPerSession} pairs per session`,
        talksCount,
        sessionsCount,
        sessionPlans: createFixedSessionPlans(sessionsCount, pairsPerSession),
    })
}

export function printComparisonReports(reports: FairnessReport[]): void {
    if (reports.length === 0) {
        return
    }

    printTable(
        reports.map((report) => ({
            Version: report.version.toUpperCase(),
            'Pairs Shown': report.totalPairsShown.toLocaleString(),
            'Talk Min-Max': `${report.statistics.talkAppearances.min}-${report.statistics.talkAppearances.max}`,
            'Talk CV': formatPercent(report.statistics.talkAppearances.coefficientOfVariation),
            'Pair Coverage': formatPercent(report.statistics.pairFrequencies.coveragePercent),
            'Pair CV': formatPercent(report.statistics.pairFrequencies.coefficientOfVariation),
            'Round Talk Dupes': report.duplicateAnalysis.duplicateTalksWithinRound.toLocaleString(),
            'User Pair Dupes': report.duplicateAnalysis.duplicatePairsWithinSession.toLocaleString(),
            'Max Side Imbalance': report.statistics.sideBalance.maxTalkImbalance.toLocaleString(),
            Checks: formatChecks(report.checks),
        })),
    )
}

export function printFairnessReport(report: FairnessReport): void {
    const talkStats = report.statistics.talkAppearances
    const pairStats = report.statistics.pairFrequencies
    const sideBalance = report.statistics.sideBalance

    console.log(`\n${'='.repeat(88)}`)
    console.log(`${report.scenarioName} - ${report.version.toUpperCase()}: ${report.label}`)
    console.log(`${'='.repeat(88)}`)

    console.log(`Talks: ${report.talksCount}`)
    console.log(`Sessions: ${report.sessionsCount}`)
    console.log(`Pairs shown: ${report.totalPairsShown.toLocaleString()}`)
    console.log(`Max pairs per round: ${report.maxPairsPerRound}`)

    console.log('\nSession mix:')
    printTable(
        report.sessionProfiles.map((profile) => ({
            Profile: profile.profile,
            Sessions: profile.sessions.toLocaleString(),
            'Requested Pairs': `${profile.minRequestedPairs}-${profile.maxRequestedPairs}`,
            Avg: profile.avgRequestedPairs.toFixed(1),
        })),
    )

    console.log('\nTalk exposure:')
    console.log(`- Min/max: ${talkStats.min} / ${talkStats.max}`)
    console.log(`- Average: ${talkStats.avg.toFixed(2)}`)
    console.log(`- Standard deviation: ${talkStats.stdDeviation.toFixed(2)}`)
    console.log(`- Coefficient of variation: ${formatPercent(talkStats.coefficientOfVariation)}`)
    console.log(`- Gini: ${talkStats.gini.toFixed(4)}`)

    console.log('\nPair frequency:')
    console.log(`- Unique pairs shown: ${pairStats.uniquePairsShown.toLocaleString()}`)
    console.log(`- Total possible pairs: ${pairStats.totalPossiblePairs.toLocaleString()}`)
    console.log(`- Coverage: ${formatPercent(pairStats.coveragePercent)}`)
    console.log(`- Min/max frequency across all possible pairs: ${pairStats.min} / ${pairStats.max}`)
    console.log(`- Average frequency: ${pairStats.avg.toFixed(2)}`)
    console.log(`- Coefficient of variation: ${formatPercent(pairStats.coefficientOfVariation)}`)
    console.log(`- Gini: ${pairStats.gini.toFixed(4)}`)

    console.log('\nLeft/right balance:')
    console.log(`- Max talk imbalance: ${sideBalance.maxTalkImbalance}`)
    console.log(`- Average talk imbalance: ${sideBalance.avgTalkImbalance.toFixed(2)}`)
    console.log(`- Talks leaning left/right/balanced: ${sideBalance.talksLeaningLeft}/${sideBalance.talksLeaningRight}/${sideBalance.balancedTalks}`)

    console.log('\nDuplicate analysis:')
    console.log(`- Duplicate talks within a round: ${report.duplicateAnalysis.duplicateTalksWithinRound}`)
    console.log(`- Rounds with duplicate talks: ${report.duplicateAnalysis.roundsWithDuplicateTalks}`)
    console.log(`- Duplicate pairs within one user session: ${report.duplicateAnalysis.duplicatePairsWithinSession}`)
    console.log(`- Sessions with duplicate pairs: ${report.duplicateAnalysis.sessionsWithDuplicatePairs}`)
    console.log(`- Repeated talk exposures within one user session: ${report.duplicateAnalysis.repeatedTalksWithinSession}`)
    console.log(`- Sessions with repeated talks: ${report.duplicateAnalysis.sessionsWithRepeatedTalks}`)

    if (report.duplicateAnalysis.examples.length > 0) {
        console.log('\nExamples:')
        report.duplicateAnalysis.examples.forEach((example) => {
            console.log(`- Session ${example.session}: ${example.issue}: ${example.values.slice(0, 8).join(', ')}`)
        })
    }

    console.log('\nChecks:')
    console.log(`- Talk exposure CV <= 5%: ${formatPassFail(report.checks.talkExposureFair)}`)
    console.log(`- No duplicate talks within a round: ${formatPassFail(report.checks.noDuplicateTalksWithinRound)}`)
    console.log(`- No duplicate pairs within one user session: ${formatPassFail(report.checks.noDuplicatePairsWithinSession)}`)
}

export function getDefaultValidationScenarios(): ValidationScenario[] {
    return [
        {
            name: 'Mixed voter behaviour, 250 talks',
            talksCount: 250,
            sessionsCount: 1000,
            sessionPlans: createMixedSessionPlans(250, 1000),
        },
        {
            name: 'Short partial sessions, 250 talks',
            talksCount: 250,
            sessionsCount: 1000,
            sessionPlans: createFixedSessionPlans(1000, 50),
        },
        {
            name: 'One complete round, 250 talks',
            talksCount: 250,
            sessionsCount: 1000,
            sessionPlans: createFixedSessionPlans(1000, 125),
        },
        {
            name: 'Two complete rounds, 250 talks',
            talksCount: 250,
            sessionsCount: 1000,
            sessionPlans: createFixedSessionPlans(1000, 250),
        },
        {
            name: 'Mixed voter behaviour, odd 251 talks',
            talksCount: 251,
            sessionsCount: 1000,
            sessionPlans: createMixedSessionPlans(251, 1000),
        },
    ]
}

function getSessionPairs(
    algorithm: PairingAlgorithm,
    talksCount: number,
    sessionSeed: number,
    requestedPairs: number,
): Array<{ pair: Pair; roundNumber: number; position: number }> {
    const pairs: Array<{ pair: Pair; roundNumber: number; position: number }> = []
    const maxPairsPerRound = Math.floor(talksCount / 2)
    let remainingPairs = requestedPairs
    let roundNumber = 0

    while (remainingPairs > 0 && maxPairsPerRound > 0) {
        const roundPairs = algorithm.getRoundPairs(talksCount, sessionSeed, roundNumber)
        const pairsToTake = Math.min(remainingPairs, roundPairs.length)

        for (let position = 0; position < pairsToTake; position++) {
            pairs.push({
                pair: roundPairs[position],
                roundNumber,
                position,
            })
        }

        remainingPairs -= pairsToTake
        roundNumber++

        if (pairsToTake === 0) {
            break
        }
    }

    return pairs
}

function calculateDistributionStats(values: number[]): DistributionStats {
    if (values.length === 0) {
        return {
            min: 0,
            max: 0,
            avg: 0,
            stdDeviation: 0,
            coefficientOfVariation: 0,
            gini: 0,
        }
    }

    const total = values.reduce((sum, value) => sum + value, 0)
    const avg = total / values.length
    const min = values.reduce((currentMin, value) => Math.min(currentMin, value), values[0])
    const max = values.reduce((currentMax, value) => Math.max(currentMax, value), values[0])
    const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length
    const stdDeviation = Math.sqrt(variance)

    return {
        min,
        max,
        avg,
        stdDeviation,
        coefficientOfVariation: avg === 0 ? 0 : (stdDeviation / avg) * 100,
        gini: calculateGini(values),
    }
}

function calculatePairCoverageStats(talksCount: number, pairCoverage: Map<string, number>): PairCoverageStats {
    const pairCounts = getAllPairCounts(talksCount, pairCoverage)
    const stats = calculateDistributionStats(pairCounts)
    const totalPossiblePairs = (talksCount * (talksCount - 1)) / 2

    return {
        ...stats,
        totalPossiblePairs,
        uniquePairsShown: pairCoverage.size,
        coveragePercent: totalPossiblePairs === 0 ? 0 : (pairCoverage.size / totalPossiblePairs) * 100,
    }
}

function calculateSideBalanceStats(leftAppearances: number[], rightAppearances: number[]): SideBalanceStats {
    let maxTalkImbalance = 0
    let totalImbalance = 0
    let talksLeaningLeft = 0
    let talksLeaningRight = 0
    let balancedTalks = 0

    leftAppearances.forEach((leftCount, talkIndex) => {
        const rightCount = rightAppearances[talkIndex]
        const imbalance = Math.abs(leftCount - rightCount)

        maxTalkImbalance = Math.max(maxTalkImbalance, imbalance)
        totalImbalance += imbalance

        if (leftCount > rightCount) {
            talksLeaningLeft++
        } else if (rightCount > leftCount) {
            talksLeaningRight++
        } else {
            balancedTalks++
        }
    })

    return {
        maxTalkImbalance,
        avgTalkImbalance: leftAppearances.length === 0 ? 0 : totalImbalance / leftAppearances.length,
        talksLeaningLeft,
        talksLeaningRight,
        balancedTalks,
    }
}

function calculateGini(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const total = sorted.reduce((sum, value) => sum + value, 0)

    if (sorted.length === 0 || total === 0) {
        return 0
    }

    const weightedSum = sorted.reduce((sum, value, index) => sum + (index + 1) * value, 0)
    return (2 * weightedSum) / (sorted.length * total) - (sorted.length + 1) / sorted.length
}

function getAllPairCounts(talksCount: number, pairCoverage: Map<string, number>): number[] {
    const counts: number[] = []

    for (let talk1 = 0; talk1 < talksCount; talk1++) {
        for (let talk2 = talk1 + 1; talk2 < talksCount; talk2++) {
            counts.push(pairCoverage.get(getPairKey(talk1, talk2)) ?? 0)
        }
    }

    return counts
}

function countRepeatedTalkOccurrences(pairs: Pair[]): number {
    const seenTalks = new Set<number>()
    let repeatedTalks = 0

    for (const [talk1, talk2] of pairs) {
        if (seenTalks.has(talk1)) {
            repeatedTalks++
        } else {
            seenTalks.add(talk1)
        }

        if (seenTalks.has(talk2)) {
            repeatedTalks++
        } else {
            seenTalks.add(talk2)
        }
    }

    return repeatedTalks
}

function summarizeSessionPlans(sessionPlans: SessionPlan[]): SessionProfileSummary[] {
    const summaries = new Map<
        string,
        {
            sessions: number
            totalRequestedPairs: number
            minRequestedPairs: number
            maxRequestedPairs: number
        }
    >()

    for (const plan of sessionPlans) {
        const existingSummary = summaries.get(plan.profile)

        if (existingSummary === undefined) {
            summaries.set(plan.profile, {
                sessions: 1,
                totalRequestedPairs: plan.requestedPairs,
                minRequestedPairs: plan.requestedPairs,
                maxRequestedPairs: plan.requestedPairs,
            })
        } else {
            existingSummary.sessions++
            existingSummary.totalRequestedPairs += plan.requestedPairs
            existingSummary.minRequestedPairs = Math.min(existingSummary.minRequestedPairs, plan.requestedPairs)
            existingSummary.maxRequestedPairs = Math.max(existingSummary.maxRequestedPairs, plan.requestedPairs)
        }
    }

    return Array.from(summaries.entries())
        .map(([profile, summary]) => ({
            profile,
            sessions: summary.sessions,
            minRequestedPairs: summary.minRequestedPairs,
            maxRequestedPairs: summary.maxRequestedPairs,
            avgRequestedPairs: summary.totalRequestedPairs / summary.sessions,
        }))
        .sort((left, right) => left.minRequestedPairs - right.minRequestedPairs)
}

function addExample(
    examples: DuplicateAnalysis['examples'],
    session: number,
    issue: string,
    values: string[],
): void {
    if (examples.length >= 8) {
        return
    }

    examples.push({
        session,
        issue,
        values: values.slice(0, 10),
    })
}

function getPairKey(talk1: number, talk2: number): string {
    return `${Math.min(talk1, talk2)}-${Math.max(talk1, talk2)}`
}

function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`
}

function formatChecks(checks: ValidationChecks): string {
    return [
        checks.talkExposureFair ? 'talk' : 'talk!',
        checks.noDuplicateTalksWithinRound ? 'round' : 'round!',
        checks.noDuplicatePairsWithinSession ? 'pairs' : 'pairs!',
    ].join(' ')
}

function formatPassFail(value: boolean): string {
    return value ? 'PASS' : 'FAIL'
}

function printTable(rows: Array<Record<string, string>>): void {
    if (rows.length === 0) {
        return
    }

    const headers = Object.keys(rows[0])
    const columnWidths = headers.map((header) =>
        rows.reduce((width, row) => Math.max(width, row[header].length), header.length),
    )
    const headerLine = headers.map((header, index) => header.padEnd(columnWidths[index])).join(' | ')
    const dividerLine = columnWidths.map((width) => '-'.repeat(width)).join('-|-')

    console.log(headerLine)
    console.log(dividerLine)

    rows.forEach((row) => {
        console.log(headers.map((header, index) => row[header].padEnd(columnWidths[index])).join(' | '))
    })
}

function mix32(value: number): number {
    let hash = value >>> 0
    hash ^= hash >>> 16
    hash = Math.imul(hash, 0x7feb352d)
    hash ^= hash >>> 15
    hash = Math.imul(hash, 0x846ca68b)
    hash ^= hash >>> 16
    return hash >>> 0
}

function runDefaultValidation(): void {
    for (const scenario of getDefaultValidationScenarios()) {
        console.log(`\n${'#'.repeat(88)}`)
        console.log(scenario.name)
        console.log(`${'#'.repeat(88)}\n`)
        const reports = validateAllVersions(scenario)
        printComparisonReports(reports)
    }
}

const isDirectRun = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
    runDefaultValidation()
}

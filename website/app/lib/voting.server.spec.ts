import { TableClient, TableServiceClient } from '@azure/data-tables'
import { BlobServiceClient } from '@azure/storage-blob'
import { http, passthrough } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getActiveVotingSession } from './azure-storage.server'
import type { ConferenceState } from './conference-state-client-safe'
import type { ConferenceYear } from './config-types.server'
import { initializeVoting } from './voting.server'

// Example Sessionize API mock response
const sessionizeMockResponse = [
    {
        groupId: 'g1',
        groupName: 'Session Group',
        isDefault: true,
        sessions: [
            {
                id: '101',
                title: 'Test Session 1',
                description: 'A test session',
                startsAt: null,
                endsAt: null,
                isServiceSession: false,
                isPlenumSession: false,
                speakers: [{ id: 's1', name: 'Alice' }],
                categories: [
                    {
                        id: 1,
                        name: 'Track',
                        categoryItems: [{ id: 1, name: 'Dev' }],
                        sort: null,
                    },
                ],
                roomId: 1,
                room: 'Main Hall',
                liveUrl: null,
                recordingUrl: null,
                status: null,
                isInformed: false,
                isConfirmed: true,
                questionAnswers: [],
            },
            {
                id: '102',
                title: 'Test Session 2',
                description: 'Another test session',
                startsAt: null,
                endsAt: null,
                isServiceSession: false,
                isPlenumSession: false,
                speakers: [{ id: 's2', name: 'Bob' }],
                categories: [
                    {
                        id: 2,
                        name: 'Track',
                        categoryItems: [{ id: 2, name: 'Ops' }],
                        sort: null,
                    },
                ],
                roomId: 2,
                room: 'Side Room',
                liveUrl: null,
                recordingUrl: null,
                status: null,
                isInformed: false,
                isConfirmed: true,
                questionAnswers: [],
            },
            {
                id: '103',
                title: 'Test Session 3',
                description: 'Yet another test session',
                startsAt: null,
                endsAt: null,
                isServiceSession: false,
                isPlenumSession: false,
                speakers: [{ id: 's3', name: 'Carol' }],
                categories: [
                    {
                        id: 3,
                        name: 'Track',
                        categoryItems: [{ id: 3, name: 'UX' }],
                        sort: null,
                    },
                ],
                roomId: 3,
                room: 'Workshop Room',
                liveUrl: null,
                recordingUrl: null,
                status: null,
                isInformed: false,
                isConfirmed: true,
                questionAnswers: [],
            },
        ],
    },
]

const server = setupServer(
    http.get(/(sessionize|example\.com).*\/(all|Sessions)/i, ({ request }) => {
        return new Response(JSON.stringify(sessionizeMockResponse))
    }),
    // Explicitly allow passthrough for Azurite (localhost:10000) requests (all HTTP methods)
    http.all(/127\.0\.0\.1:10000|localhost:10000/, ({ request }) => {
        return passthrough()
    }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const TEST_PREFIX = 'test-voting-' + Date.now()

describe('voting.server logic', () => {
    let blobServiceClient: BlobServiceClient
    let tableServiceClient: TableServiceClient
    let tableClient: TableClient

    beforeAll(async () => {
        try {
            const AZURITE_CONNECTION_STRING = 'UseDevelopmentStorage=true'
            blobServiceClient = BlobServiceClient.fromConnectionString(AZURITE_CONNECTION_STRING)
            tableServiceClient = TableServiceClient.fromConnectionString(AZURITE_CONNECTION_STRING)
            tableClient = TableClient.fromConnectionString(AZURITE_CONNECTION_STRING, 'VotingSessions')
            // Attempt to list containers to verify Azurite is running
            await blobServiceClient.listContainers().next()
        } catch (err) {
            console.error('Azurite not running or misconfigured:', err)
            throw new Error('Azurite not running or misconfigured')
        }
    })

    it('initializeVoting creates a voting session in Azurite', async () => {
        const yearConfig = makeConferenceYear()
        const state = makeConferenceState({ talkVoting: { state: 'open', closes: '2025-09-08T23:59:59+08:00' } })
        // Use real Azure clients (Azurite)
        const sessionId = await initializeVoting(blobServiceClient, tableServiceClient, tableClient, yearConfig, state)
        expect(sessionId).toContain(yearConfig.year)
        const session = await getActiveVotingSession(tableClient, yearConfig.year)
        expect(session).toBeDefined()
        expect(session?.sessionId).toBe(sessionId)
    })

    it('throws if sessions is missing', async () => {
        const yearConfig = makeConferenceYear({ sessions: undefined })
        const state = makeConferenceState()
        await expect(
            initializeVoting(blobServiceClient, tableServiceClient, tableClient, yearConfig, state),
        ).rejects.toThrow('No Sessionize URL configured for this year')
    })

    it('throws if allSessionsEndpoint is missing', async () => {
        const yearConfig = makeConferenceYear({
            sessions: {
                kind: 'sessionize',
                sessionizeEndpoint: 'https://example.com/api',
                allSessionsEndpoint: undefined,
            },
        })
        const state = makeConferenceState()
        await expect(
            initializeVoting(blobServiceClient, tableServiceClient, tableClient, yearConfig, state),
        ).rejects.toThrow('No Sessionize all sessions endpoint configured for this year')
    })

    it('throws if voting is not open', async () => {
        const yearConfig = makeConferenceYear()
        const state = makeConferenceState({ talkVoting: { state: 'closed' } })
        await expect(
            initializeVoting(blobServiceClient, tableServiceClient, tableClient, yearConfig, state),
        ).rejects.toThrow('Voting is not currently open')
    })
})

// Helper: Minimal valid ConferenceYear for tests
function makeConferenceYear(overrides: Partial<ConferenceYear> = {}): ConferenceYear {
    return {
        kind: 'conference',
        year: (TEST_PREFIX + '-2025') as any,
        sessionizeUrl: 'https://example.com/api',
        ticketInfo: undefined,
        conferenceDate: undefined,
        agendaPublishedDateTime: undefined,
        cfpDates: undefined,
        ticketReleases: [],
        talkVotingDates: undefined,
        feedbackOpenUntilDateTime: undefined,
        venue: undefined,
        sessions: {
            kind: 'sessionize',
            sessionizeEndpoint: 'https://example.com/api',
            allSessionsEndpoint: 'https://example.com/api/all',
        },
        sponsors: {},
        ...overrides,
    }
}

// Helper: Minimal valid ConferenceState for tests
function makeConferenceState(overrides: Partial<ConferenceState> = {}): ConferenceState {
    return {
        conferenceState: 'before-conference',
        conference: {
            date: '2025-09-01',
            year: (TEST_PREFIX + '-2025') as any,
            venue: undefined,
            sponsors: {},
            currentTicketSale: undefined,
        },
        talkVoting: { state: 'open', closes: '2025-09-08T23:59:59+08:00' },
        callForPapers: { state: 'closed' },
        ticketSales: { state: 'closed' },
        feedback: 'not-open-yet',
        agenda: 'not-released',
        needsVolunteers: false,
        previousConference: undefined,
        ...(overrides as any),
    }
}

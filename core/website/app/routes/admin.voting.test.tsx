// @vitest-environment jsdom
/**
 * Tests for the chunk-driven validation runner in the admin voting page: the
 * page itself drives a running validation by submitting chunk requests
 * back-to-back, stops (without auto-retrying) on error, and can resume a run
 * that lost its driving page. The route's real loader/action are replaced by
 * an in-memory run state machine; the component under test is the real one.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import AdminVoting from './admin.voting'

const CHUNK_SIZE = 25

interface RunState {
    runId: string
    processed: number
    status: 'running' | 'completed'
}

interface HarnessOptions {
    totalSessions: number
    /** 1-based index of the chunk call that should fail (fails once). */
    failChunkCall?: number
    /** Omit the runId from the failure response (a malformed server error). */
    failWithoutRunId?: boolean
    initialRun?: RunState
    stalledMinutes?: number
}

function setupHarness({ totalSessions, failChunkCall, failWithoutRunId, initialRun, stalledMinutes = 0 }: HarnessOptions) {
    const state = {
        run: initialRun ? { ...initialRun } : null,
        chunkCalls: [] as string[],
    }

    const loader = () => {
        const running = state.run?.status === 'running'
        return {
            votingState: 'closed',
            conferenceState: { talkVoting: { state: 'closed' }, conference: { year: '2026' } },
            sessionCount: totalSessions,
            validationRuns: {
                runs: state.run
                    ? [
                          {
                              runId: state.run.runId,
                              status: state.run.status,
                              startedAt: '2026-07-28T01:00:00.000Z',
                              completedAt: undefined,
                              lastUpdatedAt: '2026-07-28T01:00:00.000Z',
                              totalSessions,
                              processedSessions: state.run.processed,
                              percentComplete: Math.round((state.run.processed / totalSessions) * 100),
                          },
                      ]
                    : [],
                isRunning: running,
                currentRunId: running ? state.run?.runId : undefined,
                // Mirrors the loader: Resume is only offered once the run looks
                // driverless (no progress for RUN_DRIVERLESS_AFTER_MS = 1 minute)
                resumableRunId: running && stalledMinutes >= 1 ? state.run?.runId : undefined,
                stalledMinutes: running ? stalledMinutes : 0,
            },
            underrepresentedGroups: { availableGroups: [], selectedGroups: [] },
        }
    }

    const action = async ({ request }: { request: Request }) => {
        const formData = await request.formData()

        if (formData.get('intent') === 'process_validation_chunk') {
            const runIdValue = formData.get('runId')
            const runId = typeof runIdValue === 'string' ? runIdValue : ''
            state.chunkCalls.push(runId)

            if (failChunkCall === state.chunkCalls.length) {
                return failWithoutRunId
                    ? { success: false, error: 'Simulated chunk failure' }
                    : { success: false, runId, error: 'Simulated chunk failure' }
            }

            if (!state.run || state.run.runId !== runId) {
                return { success: false, runId, error: 'Unknown run' }
            }

            state.run.processed = Math.min(state.run.processed + CHUNK_SIZE, totalSessions)
            const done = state.run.processed >= totalSessions
            if (done) {
                state.run.status = 'completed'
            }
            return {
                success: true,
                runId,
                done,
                processedSessions: state.run.processed,
                totalSessions,
            }
        }

        state.run = { runId: 'run-under-test', processed: 0, status: 'running' }
        return { success: true, runId: state.run.runId }
    }

    const Stub = createRoutesStub([{ path: '/admin/voting', Component: AdminVoting, loader, action }])
    render(<Stub initialEntries={['/admin/voting']} />)

    return { state }
}

/** The stub router renders nothing until its loader resolves. */
async function pageReady(): Promise<void> {
    await screen.findByRole('button', { name: /Start Validation|Validation Running/ })
}

function startButton(): HTMLButtonElement {
    return screen.getByRole<HTMLButtonElement>('button', { name: /Start Validation|Validation Running/ })
}

async function settle(ms = 150) {
    await new Promise((resolve) => setTimeout(resolve, ms))
}

afterEach(cleanup)

describe('AdminVoting validation chunk driver', () => {
    it('drives a started run chunk-by-chunk until done, then stops', async () => {
        const { state } = setupHarness({ totalSessions: 60 })
        await pageReady()

        fireEvent.click(startButton())

        // 60 sessions at 25 per chunk = 3 chunks (the last one reports done)
        await waitFor(() => expect(state.chunkCalls).toHaveLength(3))
        await waitFor(() => expect(startButton().disabled).toBe(false))

        // No further chunk submissions after completion
        await settle()
        expect(state.chunkCalls).toHaveLength(3)
        expect(state.run?.status).toBe('completed')
        expect(state.run?.processed).toBe(60)
    })

    it('stops on a chunk error without auto-retrying, and Resume picks the run back up', async () => {
        const { state } = setupHarness({ totalSessions: 60, failChunkCall: 2 })
        await pageReady()

        fireEvent.click(startButton())

        await waitFor(() => expect(state.chunkCalls).toHaveLength(2))
        await waitFor(() => expect(screen.getByText(/Validation processing stopped/)).toBeTruthy())

        // The driver must not retry on its own
        await settle()
        expect(state.chunkCalls).toHaveLength(2)
        expect(state.run?.processed).toBe(25)

        fireEvent.click(screen.getByRole('button', { name: 'Resume Validation' }))

        // Two more chunks finish the remaining 35 sessions
        await waitFor(() => expect(state.run?.status).toBe('completed'))
        expect(state.chunkCalls).toHaveLength(4)
        expect(state.run?.processed).toBe(60)
    })

    it('treats an error response missing its runId as terminal instead of resubmitting forever', async () => {
        const { state } = setupHarness({ totalSessions: 60, failChunkCall: 2, failWithoutRunId: true })
        await pageReady()

        fireEvent.click(startButton())

        await waitFor(() => expect(state.chunkCalls).toHaveLength(2))
        await waitFor(() => expect(screen.getByText(/Validation processing stopped/)).toBeTruthy())

        await settle()
        expect(state.chunkCalls).toHaveLength(2)
    })

    it('offers Resume for a stalled run from a fresh page load and completes it', async () => {
        const { state } = setupHarness({
            totalSessions: 60,
            initialRun: { runId: 'run-stalled', processed: 30, status: 'running' },
            stalledMinutes: 10,
        })
        await pageReady()

        expect(screen.getByText(/No progress for 10 minutes/)).toBeTruthy()
        expect(startButton().disabled).toBe(true)

        fireEvent.click(screen.getByRole('button', { name: 'Resume Validation' }))

        await waitFor(() => expect(state.run?.status).toBe('completed'))
        // 30 already done, so 25 + 5 = two chunks, resumed mid-run
        expect(state.chunkCalls).toHaveLength(2)
        expect(state.chunkCalls.every((runId) => runId === 'run-stalled')).toBe(true)
        expect(state.run?.processed).toBe(60)

        await waitFor(() => expect(startButton().disabled).toBe(false))
    })
})

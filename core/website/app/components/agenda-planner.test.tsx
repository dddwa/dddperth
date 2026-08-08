// @vitest-environment jsdom
/**
 * Tests for the planner board's talk cards: the signal chips that let
 * organizers read the balance of the agenda (rank, level, UM, new speaker,
 * pronouns) while filling it, and the tentative shading in the unplaced list.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PlannerBoard } from '~/lib/agenda-planning-types'
import { AgendaPlanner, type PlannerTalk } from './agenda-planner'

afterEach(cleanup)

function talk(overrides: Partial<PlannerTalk> = {}): PlannerTalk {
    return {
        talkId: 't1',
        title: 'A Talk',
        length: '45 minutes',
        speakers: 'Alex',
        topic: 'Cloud',
        status: 'locked',
        rank: 3,
        level: 'Beginner',
        um: false,
        newSpeaker: false,
        pronouns: [],
        ...overrides,
    }
}

const BOARD_WITH_EMPTY_SLOT: PlannerBoard = {
    tracks: [{ trackId: 'tr1', name: 'Track 1', slots: [{ slotId: 's1', length: '45 minutes', talkId: null }] }],
    capacity: {},
}

function renderPlanner(talks: PlannerTalk[], board: PlannerBoard = BOARD_WITH_EMPTY_SLOT) {
    return render(
        <AgendaPlanner board={board} talks={talks} availableLengths={['45 minutes']} onChange={() => {}} />,
    )
}

/** The unplaced list is the section headed "Unplaced talks (n)". */
function unplacedCard(title: string) {
    const card = screen.getByTitle(new RegExp(`^${title} — `))
    return card
}

describe('talk signal chips', () => {
    it('always shows the vote rank', () => {
        renderPlanner([talk({ rank: 12 })])
        expect(within(unplacedCard('A Talk')).getByText('#12')).toBeTruthy()
    })

    it('abbreviates the level to a single letter', () => {
        renderPlanner([talk({ level: 'Advanced' })])
        expect(within(unplacedCard('A Talk')).getByTitle('Level: Advanced')).toBeTruthy()
        expect(within(unplacedCard('A Talk')).getByText('A')).toBeTruthy()
    })

    it('omits the level chip when the talk has no level', () => {
        renderPlanner([talk({ level: '' })])
        expect(within(unplacedCard('A Talk')).queryByTitle(/^Level:/)).toBeNull()
    })

    it('shows UM and new-speaker chips only when flagged', () => {
        renderPlanner([talk({ um: true, newSpeaker: true })])
        const card = unplacedCard('A Talk')
        expect(within(card).getByText('UM')).toBeTruthy()
        expect(within(card).getByText('NEW')).toBeTruthy()
    })

    it('hides UM and new-speaker chips when not flagged', () => {
        renderPlanner([talk({ um: false, newSpeaker: false })])
        const card = unplacedCard('A Talk')
        expect(within(card).queryByText('UM')).toBeNull()
        expect(within(card).queryByText('NEW')).toBeNull()
    })

    it('shows non-He/Him pronouns and dims the common case', () => {
        renderPlanner([talk({ pronouns: ['She/Her', 'He/Him'] })])
        const card = unplacedCard('A Talk')
        expect(within(card).getByText('She/Her')).toBeTruthy()
        expect(within(card).queryByText('He/Him')).toBeNull()
    })

    it('renders chips on a placed talk too, not just unplaced ones', () => {
        const board: PlannerBoard = {
            tracks: [
                { trackId: 'tr1', name: 'Track 1', slots: [{ slotId: 's1', length: '45 minutes', talkId: 't1' }] },
            ],
            capacity: {},
        }
        renderPlanner([talk({ um: true, rank: 7 })], board)
        expect(screen.getByText('#7')).toBeTruthy()
        expect(screen.getByText('UM')).toBeTruthy()
    })
})

describe('tentative talks in the unplaced list', () => {
    it('marks tentative talks in their tooltip so they can be prioritised', () => {
        renderPlanner([talk({ talkId: 't1', title: 'Tentative Talk', status: 'tentative' })])
        expect(screen.getByTitle(/Tentative Talk — Alex \(tentative\)/)).toBeTruthy()
    })

    it('does not mark accepted talks as tentative', () => {
        renderPlanner([talk({ title: 'Locked Talk', status: 'locked' })])
        expect(screen.getByTitle('Locked Talk — Alex')).toBeTruthy()
    })

    it('counts the unplaced tentative talks in the heading', () => {
        renderPlanner([
            talk({ talkId: 't1', title: 'One', status: 'tentative' }),
            talk({ talkId: 't2', title: 'Two', status: 'tentative' }),
            talk({ talkId: 't3', title: 'Three', status: 'locked' }),
        ])
        expect(screen.getByText('2 tentative')).toBeTruthy()
        expect(screen.getByText('Unplaced talks (3)')).toBeTruthy()
    })

    it('omits the tentative pill when none are left unplaced', () => {
        renderPlanner([talk({ status: 'locked' })])
        expect(screen.queryByText(/tentative$/)).toBeNull()
    })
})

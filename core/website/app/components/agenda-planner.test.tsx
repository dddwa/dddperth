// @vitest-environment jsdom
/**
 * Tests for the planner board's talk cards: the signal chips that let
 * organizers read the balance of the agenda (rank, level, topic, UM, new
 * speaker) while filling it, and the tentative shading on both the board and
 * the unplaced list.
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

    it('shows the topic category in full rather than an initial', () => {
        renderPlanner([talk({ topic: 'Cloud & Infrastructure' })])
        const card = unplacedCard('A Talk')
        expect(within(card).getByTitle('Topic: Cloud & Infrastructure')).toBeTruthy()
        expect(within(card).getByText('Cloud & Infrastructure')).toBeTruthy()
    })

    it('labels a talk with no topic as Uncategorised', () => {
        renderPlanner([talk({ topic: '' })])
        expect(within(unplacedCard('A Talk')).getByTitle('Topic: Uncategorised')).toBeTruthy()
    })

    it('shows the talk length on unplaced cards, since it decides which slot fits', () => {
        renderPlanner([talk({ length: '20 minutes' })])
        const card = unplacedCard('A Talk')
        expect(within(card).getByTitle('Length: 20 minutes')).toBeTruthy()
        expect(within(card).getByText('20m')).toBeTruthy()
    })

    it('omits the length chip when the talk has no length', () => {
        renderPlanner([talk({ length: '' })])
        expect(within(unplacedCard('A Talk')).queryByTitle(/^Length:/)).toBeNull()
    })

    it('omits the length chip on placed cards, where the slot already names it', () => {
        const board: PlannerBoard = {
            tracks: [
                { trackId: 'tr1', name: 'Track 1', slots: [{ slotId: 's1', length: '45 minutes', talkId: 't1' }] },
            ],
            capacity: {},
        }
        renderPlanner([talk({ length: '45 minutes' })], board)
        expect(screen.queryByTitle('Length: 45 minutes')).toBeNull()
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

describe('board grid alignment', () => {
    // Two tracks of differing length: slot N of each must share a grid row so
    // the cards line up across columns however tall any one card grows.
    const UNEVEN_BOARD: PlannerBoard = {
        tracks: [
            {
                trackId: 'tr1',
                name: 'Track 1',
                slots: [
                    { slotId: 'a1', length: '45 minutes', talkId: 't1' },
                    { slotId: 'a2', length: '20 minutes', talkId: null },
                ],
            },
            {
                trackId: 'tr2',
                name: 'Track 2',
                slots: [{ slotId: 'b1', length: '45 minutes', talkId: 't2' }],
            },
        ],
        capacity: {},
    }

    const TALKS = [
        talk({ talkId: 't1', title: 'First Talk' }),
        talk({
            talkId: 't2',
            title: 'A considerably longer talk title that wraps onto several lines on the card',
        }),
    ]

    /**
     * Grid placement is set inline, not through Panda props — the row/column
     * values are computed, and Panda's static extraction would emit a class
     * with no CSS behind it. Asserting on style is therefore asserting on what
     * actually positions the card.
     */
    function slotCardFor(title: string) {
        return screen.getByText(title).closest<HTMLElement>('[style*="grid-row"]')
    }

    it('puts the first slot of every track in the same grid row', () => {
        render(
            <AgendaPlanner board={UNEVEN_BOARD} talks={TALKS} availableLengths={['45 minutes']} onChange={() => {}} />,
        )
        // Row 1 is the track header, so the first slot of each track sits in
        // row 2 — that shared row is what keeps the cards aligned.
        expect(slotCardFor('First Talk')?.style.gridRow).toBe('2')
        expect(slotCardFor(TALKS[1].title)?.style.gridRow).toBe('2')
    })

    it('places each track in its own grid column', () => {
        render(
            <AgendaPlanner board={UNEVEN_BOARD} talks={TALKS} availableLengths={['45 minutes']} onChange={() => {}} />,
        )
        expect(slotCardFor('First Talk')?.style.gridColumn).toBe('1')
        expect(slotCardFor(TALKS[1].title)?.style.gridColumn).toBe('2')
    })

    it('puts a second slot in the next row down, not alongside the first', () => {
        render(
            <AgendaPlanner board={UNEVEN_BOARD} talks={TALKS} availableLengths={['45 minutes']} onChange={() => {}} />,
        )
        // Track 1's empty second slot renders its "pick a talk" dropdown.
        const emptySlot = screen.getByLabelText('Assign talk to slot').closest<HTMLElement>('[style*="grid-row"]')
        expect(emptySlot?.style.gridRow).toBe('3')
        expect(emptySlot?.style.gridColumn).toBe('1')
    })

    it('sizes the grid to the longest track so shorter ones leave empty rows', () => {
        const { container } = render(
            <AgendaPlanner board={UNEVEN_BOARD} talks={TALKS} availableLengths={['45 minutes']} onChange={() => {}} />,
        )
        const grid = container.querySelector<HTMLElement>('[style*="grid-template-columns"]')
        expect(grid?.style.gridTemplateColumns).toBe('repeat(2, 260px)')
        // Header + 2 slot rows (the longest track) + the add-slot row.
        expect(grid?.style.gridTemplateRows).toBe('auto repeat(2, auto) auto')
    })
})

describe('tentative talks placed on the board', () => {
    const boardWithTalk: PlannerBoard = {
        tracks: [{ trackId: 'tr1', name: 'Track 1', slots: [{ slotId: 's1', length: '45 minutes', talkId: 't1' }] }],
        capacity: {},
    }

    /** The slot card is the element carrying the inline grid placement. */
    function slotCardFor(title: string) {
        return screen.getByText(title).closest<HTMLElement>('[style*="grid-row"]')
    }

    it('tints a placed tentative talk so an apparently-full agenda still shows it', () => {
        renderPlanner([talk({ title: 'Tentative Talk', status: 'tentative' })], boardWithTalk)
        const card = slotCardFor('Tentative Talk')
        expect(card?.className).toMatch(/bg_status\.warning\.bg/)
    })

    it('leaves an accepted placed talk on the plain background', () => {
        renderPlanner([talk({ title: 'Locked Talk', status: 'locked' })], boardWithTalk)
        const card = slotCardFor('Locked Talk')
        expect(card?.className).toMatch(/bg_white/)
        expect(card?.className).not.toMatch(/bg_status\.warning\.bg/)
    })
})

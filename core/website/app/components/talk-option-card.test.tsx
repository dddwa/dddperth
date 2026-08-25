// @vitest-environment jsdom
/**
 * Tests for TalkOptionCard's keyboard/AT contract.
 *
 * This card was converted from a `div` + `onClick` (mouse-only, with a
 * hover-only lift/glow affordance) to a real `<button>`. The e2e suite
 * can't cover it: the card only renders once the voting page has live
 * Sessionize pairs, which no default checkout or CI run has — the e2e test
 * that claimed to cover it silently skipped on every run, and targeted the
 * separate "OPTION 1"/"OPTION 2" vote buttons rather than the card itself.
 *
 * These assertions are the part worth locking down, and they're cheap and
 * deterministic here.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TalkOptionCard } from './TalkOptionCard'

afterEach(cleanup)

const TALK = {
    title: 'Designing Systems People Can Thrive In',
    description: 'Rules shape everything.',
    tags: ['Culture', 'Teams'],
}

describe('TalkOptionCard', () => {
    it('exposes the talk as a button named after its title', () => {
        render(<TalkOptionCard {...TALK} onClick={() => {}} />)

        // The accessible name is what a screen reader user hears and what any
        // test should target — not the sibling "OPTION 1"/"OPTION 2" buttons.
        expect(screen.getByRole('button', { name: new RegExp(TALK.title, 'i') })).toBeTruthy()
    })

    it('activates via keyboard (Enter/Space come free with a real button)', () => {
        const onClick = vi.fn()
        render(<TalkOptionCard {...TALK} onClick={onClick} />)

        const button = screen.getByRole('button', { name: new RegExp(TALK.title, 'i') })
        // A native <button> fires click for both Enter and Space; asserting the
        // element type is what guarantees that, so assert it directly.
        expect(button.tagName).toBe('BUTTON')

        fireEvent.click(button)
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('stays focusable when it has no handler, so focus is never silently lost', () => {
        // The voting page drops `onClick` for ~200ms after a vote to prevent
        // double-submits. A `disabled` button is removed from the tab order,
        // so a keyboard user focused on that card loses their place with no
        // announcement. `aria-disabled` keeps it focusable and announced.
        render(<TalkOptionCard {...TALK} onClick={undefined} />)

        const button = screen.getByRole('button', { name: new RegExp(TALK.title, 'i') })
        expect(button.hasAttribute('disabled')).toBe(false)
        expect(button.getAttribute('aria-disabled')).toBe('true')
    })

    it('does not invoke anything when activated while aria-disabled', () => {
        render(<TalkOptionCard {...TALK} onClick={undefined} />)
        const button = screen.getByRole('button', { name: new RegExp(TALK.title, 'i') })
        // Should be a no-op rather than throwing.
        fireEvent.click(button)
    })

    it('renders the title as non-heading content (a button may only contain phrasing content)', () => {
        render(<TalkOptionCard {...TALK} onClick={() => {}} />)
        expect(screen.queryByRole('heading', { name: new RegExp(TALK.title, 'i') })).toBeNull()
    })
})

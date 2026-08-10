// @vitest-environment jsdom
/**
 * Tests for the multi-select filter, focused on the empty-string value.
 *
 * The agenda Status filter offers "No status" as a real selectable value ('') so
 * undecided talks can be filtered for alongside a real status — that only
 * works if the control treats '' as a value rather than as "nothing
 * selected".
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MultiSelectFilter } from './multi-select-filter'

afterEach(cleanup)

const STATUS_OPTIONS = [
    { value: '', label: 'No status' },
    { value: 'locked', label: 'Accepted' },
    { value: 'waitlist', label: 'Waitlist' },
]

describe('MultiSelectFilter with an empty-string option', () => {
    it('selects the empty value like any other', () => {
        const changes: string[][] = []
        render(
            <MultiSelectFilter
                label="Status"
                values={[]}
                options={STATUS_OPTIONS}
                onChange={(v) => changes.push(v)}
            />,
        )
        fireEvent.click(screen.getByRole('button', { name: /Status filter/ }))
        fireEvent.click(screen.getByLabelText('No status'))
        expect(changes).toEqual([['']])
    })

    it('combines "no status" with a real status', () => {
        const changes: string[][] = []
        render(
            <MultiSelectFilter
                label="Status"
                values={['waitlist']}
                options={STATUS_OPTIONS}
                onChange={(v) => changes.push(v)}
            />,
        )
        fireEvent.click(screen.getByRole('button', { name: /Status filter/ }))
        fireEvent.click(screen.getByLabelText('No status'))
        expect(changes).toEqual([['waitlist', '']])
    })

    it('shows the empty value as checked when selected', () => {
        render(
            <MultiSelectFilter label="Status" values={['']} options={STATUS_OPTIONS} onChange={() => {}} />,
        )
        fireEvent.click(screen.getByRole('button', { name: /Status filter/ }))
        expect(screen.getByLabelText<HTMLInputElement>('No status').checked).toBe(true)
    })

    it('summarises a lone empty selection by name, not as "All"', () => {
        render(
            <MultiSelectFilter label="Status" values={['']} options={STATUS_OPTIONS} onChange={() => {}} />,
        )
        // "All" would wrongly imply no filter is applied.
        expect(screen.getByRole('button', { name: /Status filter/ }).textContent).toContain('No status')
    })

    it('deselects the empty value again', () => {
        const changes: string[][] = []
        render(
            <MultiSelectFilter
                label="Status"
                values={['', 'waitlist']}
                options={STATUS_OPTIONS}
                onChange={(v) => changes.push(v)}
            />,
        )
        fireEvent.click(screen.getByRole('button', { name: /Status filter/ }))
        fireEvent.click(screen.getByLabelText('No status'))
        expect(changes).toEqual([['waitlist']])
    })
})

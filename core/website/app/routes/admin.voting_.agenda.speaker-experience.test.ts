/**
 * Tests for the speaker-experience value shown on planner cards.
 *
 * A talk can have co-speakers with different answers, so which one represents
 * the talk matters: the board shows the *most* experienced, since a
 * first-timer paired with a regular is a supported talk and shouldn't read as
 * inexperienced while balancing the agenda.
 */
import { describe, expect, it } from 'vitest'
import { getMostExperienced } from './admin.voting_.agenda.$runId'

/** Only `experience` matters here; the rest of AgendaSpeaker is padding. */
function speaker(experience: string | undefined) {
    return {
        id: 's1',
        name: 'Alex',
        tagLine: '',
        bio: null,
        pronoun: undefined,
        role: undefined,
        experience,
        additionalInfo: undefined,
        underrepresentedGroup: undefined,
        isUnderrepresented: false,
    }
}

describe('getMostExperienced', () => {
    it('returns empty when there are no speakers', () => {
        expect(getMostExperienced([])).toBe('')
    })

    it('returns empty when nobody disclosed an answer', () => {
        expect(getMostExperienced([speaker(undefined), speaker('')])).toBe('')
    })

    it('shortens a single disclosed answer', () => {
        expect(getMostExperienced([speaker('Usually more than once a month')])).toBe('> monthly')
        expect(getMostExperienced([speaker("I haven't done it before :)")])).toBe('First time')
    })

    it('picks the most experienced co-speaker, not the first listed', () => {
        expect(getMostExperienced([speaker("I haven't done it before :)"), speaker('Once a month or so')])).toBe(
            'Monthly',
        )
    })

    it('picks the most experienced regardless of speaker order', () => {
        expect(getMostExperienced([speaker('Usually more than once a month'), speaker('A few times')])).toBe(
            '> monthly',
        )
    })

    it('ignores speakers who disclosed nothing when others did', () => {
        expect(getMostExperienced([speaker(undefined), speaker('A few times')])).toBe('A few times')
    })

    it('falls back to an unrecognised answer rather than showing nothing', () => {
        // Sessionize occasionally rewords its options; an unknown answer is
        // still more informative than a blank chip.
        expect(getMostExperienced([speaker('Every so often')])).toBe('Every so often')
    })

    it('prefers a rankable answer over an unrecognised one', () => {
        expect(getMostExperienced([speaker('Every so often'), speaker('Once a month or so')])).toBe('Monthly')
    })
})

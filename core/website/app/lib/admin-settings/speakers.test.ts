import { describe, expect, it } from 'vitest'
import { parseSpeakerSettingsForm, resolveSpeakerSettings, speakerSettingsSchema, toDateTimeLocal } from './speakers'

function form(fields: Record<string, string | string[]>): FormData {
    const formData = new FormData()
    for (const [name, value] of Object.entries(fields)) {
        for (const v of Array.isArray(value) ? value : [value]) formData.append(name, v)
    }
    return formData
}

describe('parseSpeakerSettingsForm', () => {
    it('reads datetime-local values in the conference timezone, not the server one', () => {
        const result = parseSpeakerSettingsForm(form({ 'dueDate.claimTicket': '2026-09-11T22:00' }))
        if (!('value' in result)) throw new Error(result.errors.join())
        expect(result.value.dueDates.claimTicket).toBe('2026-09-11T22:00:00.000+08:00')
        // And round-trips back to the same input value.
        expect(toDateTimeLocal(result.value.dueDates.claimTicket)).toBe('2026-09-11T22:00')
    })

    it('leaves blank sections out rather than saving empty values', () => {
        const result = parseSpeakerSettingsForm(
            form({
                'training.Session 1.title': '',
                'training.Session 1.start': '2026-09-02T17:30',
                'dinner.location': 'Somewhere',
                infoPackUrl: '',
                'slot.id': ['slot-1', ''],
                'slot.label': ['', ''],
            }),
        )
        expect(result).toEqual({
            value: {
                dueDates: {},
                trainingSessions: [],
                dinner: undefined,
                infoPackUrl: undefined,
                ticketClaimUrl: undefined,
                meetTheExpertsSlots: [],
            },
        })
    })

    it('keeps existing slot ids and gives new rows a fresh one', () => {
        const result = parseSpeakerSettingsForm(
            form({ 'slot.id': ['slot-1', ''], 'slot.label': ['10:30am (renamed)', '4pm'] }),
            () => 'slot-new',
        )
        if (!('value' in result)) throw new Error(result.errors.join())
        expect(result.value.meetTheExpertsSlots).toEqual([
            { id: 'slot-1', label: '10:30am (renamed)' },
            { id: 'slot-new', label: '4pm' },
        ])
    })

    it('rejects half-filled or backwards times and bad URLs', () => {
        const result = parseSpeakerSettingsForm(
            form({
                'training.Session 1.title': 'Planning your talk',
                'training.Session 1.start': '2026-09-02T17:30',
                'dinner.start': '2026-10-02T20:00',
                'dinner.end': '2026-10-02T18:00',
                ticketClaimUrl: 'not a url',
            }),
        )
        expect(result).toEqual({
            errors: [
                'Training Session 1: needs both a start and an end',
                'Speaker dinner: end must be after start',
                'Ticket claim URL: not a valid URL',
            ],
        })
    })

    it('produces values the stored schema accepts and the portal can resolve', () => {
        const result = parseSpeakerSettingsForm(
            form({
                'training.Session 2.title': 'Presentation skills',
                'training.Session 2.start': '2026-09-09T17:30',
                'training.Session 2.end': '2026-09-09T20:00',
                'dinner.start': '2026-10-02T18:00',
                'dinner.end': '2026-10-02T20:00',
            }),
        )
        if (!('value' in result)) throw new Error(result.errors.join())
        const resolved = resolveSpeakerSettings(speakerSettingsSchema.parse(result.value))
        expect(resolved.trainingSessions[0]).toMatchObject({ id: 'Session 2', title: 'Presentation skills' })
        expect(resolved.trainingSessions[0]?.dateTime.toISO()).toBe('2026-09-09T17:30:00.000+08:00')
        expect(resolved.dinner?.endDateTime.hour).toBe(20)
    })
})

import { describe, expect, it } from 'vitest'
import { parseVolunteerSettingsForm, volunteerSettingsSchema } from './volunteers'

function form(fields: Record<string, string | string[]>): FormData {
    const formData = new FormData()
    for (const [name, value] of Object.entries(fields)) {
        for (const v of Array.isArray(value) ? value : [value]) formData.append(name, v)
    }
    return formData
}

describe('parseVolunteerSettingsForm', () => {
    it('reads several links per role, in order', () => {
        const result = parseVolunteerSettingsForm(
            form({
                'link.room-coordinators.title': ['Role instructions', 'Room checklist'],
                'link.room-coordinators.url': ['https://example.com/role', 'https://example.com/checklist'],
                'link.photographers.title': ['Shot list'],
                'link.photographers.url': ['https://example.com/shots'],
            }),
        )
        expect(result).toEqual({
            value: {
                roleLinks: {
                    'room-coordinators': [
                        { title: 'Role instructions', url: 'https://example.com/role' },
                        { title: 'Room checklist', url: 'https://example.com/checklist' },
                    ],
                    photographers: [{ title: 'Shot list', url: 'https://example.com/shots' }],
                },
            },
        })
        if ('value' in result) expect(volunteerSettingsSchema.safeParse(result.value).success).toBe(true)
    })

    it('leaves out blank rows, which is how a link is removed', () => {
        const result = parseVolunteerSettingsForm(
            form({
                'link.room-coordinators.title': ['', 'Kept', '  '],
                'link.room-coordinators.url': ['', 'https://example.com/kept', ''],
            }),
        )
        expect(result).toEqual({
            value: { roleLinks: { 'room-coordinators': [{ title: 'Kept', url: 'https://example.com/kept' }] } },
        })
    })

    it('rejects a half-filled row or a bad URL rather than dropping it', () => {
        const result = parseVolunteerSettingsForm(
            form({
                'link.photographers.title': ['No URL', '', 'Bad URL'],
                'link.photographers.url': ['', 'https://example.com/untitled', 'not a url'],
            }),
        )
        expect(result).toEqual({
            errors: [
                'Photographer link 1: needs a URL',
                'Photographer link 2: needs a title',
                'Photographer link 3: not a valid URL',
            ],
        })
    })
})

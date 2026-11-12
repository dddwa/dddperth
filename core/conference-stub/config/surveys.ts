import type { SurveyConfig } from '@ddd/conference-config'
import { conferenceTime } from './dates.ts'

/**
 * Hidden surveys, each at `/survey/<slug>`. Not linked anywhere or listed in
 * the sitemap, and `noindex` — share the URL directly. Results are at
 * /admin/surveys. One of each question kind, as a reference.
 */
export const surveys: SurveyConfig[] = [
    {
        slug: 'example-survey',
        title: 'Help shape DevConf Example',
        description: ['A few quick questions about what makes a great conference for you. Every question is optional.'],
        questions: [
            { id: 'tracks', kind: 'single', label: 'How many tracks?', options: ['1', '2–3', '4 or more'] },
            {
                id: 'topics',
                kind: 'multiple',
                label: 'Which topics interest you?',
                options: ['Web', 'Cloud', 'AI', 'Data'],
                maxChoices: 3,
                allowOther: true,
            },
            {
                id: 'hallway',
                kind: 'scale',
                label: 'How important is the hallway track?',
                minLabel: 'Not at all',
                maxLabel: 'Very',
            },
            { id: 'perfect-day', kind: 'text', long: true, label: 'Describe your perfect conference day' },
        ],
        get opens() {
            return conferenceTime('2026-01-01T00:00:00')
        },
        get closes() {
            return conferenceTime('2030-01-01T00:00:00')
        },
    },
]

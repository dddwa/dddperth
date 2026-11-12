import type { SurveyConfig } from '@ddd/conference-config'
import { conferenceTime } from './dates.ts'

/**
 * Hidden surveys, each at `/survey/<slug>`. Not linked anywhere or listed in
 * the sitemap, and `noindex` — share the URL directly. Tallies and every
 * response (plus an .xlsx download) are at /admin/surveys.
 *
 * Once responses come in, leave question `id`s alone and prefer adding
 * options to renaming them: answers are stored by id and option text, so a
 * renamed option starts a new count. See `SurveyConfig` for the details.
 */
export const surveys: SurveyConfig[] = [
    {
        slug: 'perfect-ddd',
        title: 'Design your perfect DDD',
        description: [],
        questions: [
            {
                id: 'attended',
                kind: 'single',
                label: 'How many DDD Perth conferences have you been to?',
                options: ['None yet', '1', '2–3', '4 or more'],
            },
            {
                id: 'attendees',
                kind: 'single',
                label: 'What’s the ideal number of people at the conference?',
                hint: 'Bigger means more talks and sponsors; smaller means it’s easier to find people.',
                options: ['Under 300', '300–600', '600–1,000', '1,000–1,500', 'Over 1,500', 'No preference'],
            },
            {
                id: 'tracks',
                kind: 'single',
                label: 'How many talks should run at the same time (tracks)?',
                options: ['1 — everyone sees the same talk', '2–3', '4–5', '6 or more', 'No preference'],
            },
            {
                id: 'day',
                kind: 'single',
                label: 'Which day of the week suits you best?',
                options: ['Saturday', 'Friday', 'Another weekday', 'No preference'],
            },
            {
                id: 'length',
                kind: 'single',
                label: 'How long should the conference be?',
                options: ['Half a day', 'One day', 'One day, plus a separate workshop day', 'Two days', 'No preference'],
                allowOther: true,
            },
            {
                id: 'talk-length',
                kind: 'single',
                label: 'What’s the right length for a talk?',
                options: [
                    'Lightning talks (5–10 minutes)',
                    '20 minutes',
                    '30 minutes',
                    '45 minutes',
                    'A mix of lengths',
                ],
            },
            {
                id: 'formats',
                kind: 'multiple',
                label: 'Which formats would you like to see, besides talks?',
                options: [
                    'Hands-on workshops',
                    'Panel discussions',
                    'Lightning talks',
                    'Meet the Experts',
                    'Unconference / open spaces',
                    'Live demos and coding',
                    'Career and mentoring sessions',
                ],
                allowOther: true,
            },
            {
                id: 'topics',
                kind: 'multiple',
                label: 'Which topics would you most like to hear about?',
                maxChoices: 5,
                options: [
                    'AI and machine learning',
                    'Architecture and design',
                    'Frontend and web',
                    'Backend and APIs',
                    'Cloud, DevOps and platform engineering',
                    'Data and analytics',
                    'Security',
                    'Mobile',
                    'Testing and quality',
                    'UX, design and accessibility',
                    'Agile and ways of working',
                    'Leadership and career growth',
                    'Product management',
                    'Emerging tech',
                ],
                allowOther: true,
            },
            {
                id: 'levels',
                kind: 'single',
                label: 'What level should most talks be pitched at?',
                options: ['Introductory', 'Intermediate', 'Advanced and deep dives', 'A good mix'],
            },
            {
                id: 'hallway-importance',
                kind: 'scale',
                label: 'How important is the “hallway track” — the conversations between talks — to you?',
                minLabel: 'Not important, I’m here for the talks',
                maxLabel: 'It’s the best part',
            },
            {
                id: 'hallway',
                kind: 'multiple',
                label: 'What makes a great hallway experience?',
                options: [
                    'Longer breaks between talks',
                    'Good coffee',
                    'Sponsor booths worth visiting',
                    'Meet the Experts tables',
                    'Quiet space to recharge or work',
                    'Games and activities',
                    'Organised networking or icebreakers',
                    'Plenty of seating and spots to talk',
                    'Community and meetup group stands',
                ],
                allowOther: true,
            },
            {
                id: 'break-length',
                kind: 'single',
                label: 'How long should the breaks between talks be?',
                options: ['5–10 minutes', '15 minutes', '20–30 minutes', 'Varied — some short, some long'],
            },
            {
                id: 'social',
                kind: 'single',
                label: 'Would you go to an after-party or social event?',
                options: ['Yes, definitely', 'Maybe', 'Probably not'],
            },
            {
                id: 'ticket-price',
                kind: 'single',
                label: 'What would you expect to pay for a ticket?',
                hint: 'DDD is run by volunteers and kept affordable by our sponsors.',
                options: ['Under $50', '$50–$100', '$100–$150', '$150–$250', 'Over $250'],
            },
            {
                id: 'perfect-day',
                kind: 'text',
                long: true,
                label: 'Describe your perfect conference day',
                hint: 'Anything goes: venue, food, schedule, vibe, the thing you wish other conferences did.',
            },
            {
                id: 'anything-else',
                kind: 'text',
                long: true,
                label: 'Anything else you’d like us to know?',
            },
        ],
        get opens() {
            return conferenceTime('2026-11-11T00:00:00')
        },
        get closes() {
            return conferenceTime('2027-03-01T00:00:00')
        },
    },
]

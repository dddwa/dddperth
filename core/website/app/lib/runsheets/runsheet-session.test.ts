import { describe, expect, it } from 'vitest'
import type { SessionDetails, SpeakerProfile } from '~/lib/services/speakers-store'
import { toRunsheetSessionDetail } from './runsheet-session.server'

/**
 * The run sheet's session modal is public, and the speaker portal holds things
 * speakers only gave to organisers. `toRunsheetSessionDetail` is the allowlist
 * between the two, so these tests pin what crosses it.
 */

const session = {
    title: 'A talk',
    description: 'What it covers.',
    categories: [
        { id: 1, name: 'Level', categoryItems: [{ id: 11, name: 'Introductory' }], sort: 1 },
        { id: 2, name: 'Empty', categoryItems: [], sort: 2 },
    ],
    speakers: [{ id: 'speaker-1', name: 'Speaker One' }],
}

const speakers = [
    {
        id: 'speaker-1',
        firstName: 'Speaker',
        lastName: 'One',
        fullName: 'Speaker One',
        bio: 'Their Sessionize bio.',
        tagLine: 'Engineer',
        profilePicture: null,
        sessions: [],
        categories: [{ id: 3, name: 'Your pronoun', categoryItems: [{ id: 31, name: 'She/Her' }], sort: 1 }],
    },
]

const pronouns = { category: 'Your pronoun', withheldAnswers: ["I'd rather not answer"] }

const profile: SpeakerProfile = {
    sessionizeId: 'speaker-1',
    namePhoneticSpelling: 'SPEE-ker',
    introductionUseSessionizeBio: false,
    introductionCustomText: 'Please introduce me like this.',
    dietaryRequirements: 'SECRET-dietary',
    rsvpSpeakersDinner: 'Yes',
    rsvpSpeakerTraining: ['Session 1'],
    registerMeetTheExperts: 'Other',
    registerMeetTheExpertsOther: 'SECRET-experts',
    updatedBy: 'SECRET-email@example.com',
}

const sessionDetails: SessionDetails = {
    sessionizeSessionId: '1',
    questionsPreference: 'Other',
    questionsPreferenceOther: 'Only at the end',
    presentationDetails: ['Live Demo', 'Other'],
    presentationDetailsOther: 'Needs a second screen',
    optOutOfRecording: true,
    anythingElse: 'SECRET-anything-else',
    updatedAt: 0,
    updatedBy: 'SECRET-email@example.com',
}

const build = (overrides: Partial<Parameters<typeof toRunsheetSessionDetail>[0]> = {}) =>
    toRunsheetSessionDetail({
        session,
        speakers,
        profiles: new Map([['speaker-1', profile]]),
        sessionDetails,
        pronouns,
        ...overrides,
    })

describe('toRunsheetSessionDetail', () => {
    it('carries the session, its speakers and how to run it', () => {
        expect(build()).toEqual({
            title: 'A talk',
            description: 'What it covers.',
            categories: [{ name: 'Level', items: ['Introductory'] }],
            speakers: [
                {
                    name: 'Speaker One',
                    pronouns: 'She/Her',
                    tagLine: 'Engineer',
                    bio: 'Their Sessionize bio.',
                    pronunciation: 'SPEE-ker',
                    introduction: 'Please introduce me like this.',
                },
            ],
            running: {
                questions: 'Only at the end',
                presentationNeeds: ['Live Demo', 'Needs a second screen'],
            },
        })
    })

    it('never carries what speakers gave only to organisers', () => {
        // Checked on the serialised output, so a field added anywhere in the
        // result is caught — not just the ones named above.
        expect(JSON.stringify(build())).not.toContain('SECRET')
    })

    it('introduces a speaker with their Sessionize bio when they asked for it', () => {
        const profiles = new Map([['speaker-1', { ...profile, introductionUseSessionizeBio: true }]])
        expect(build({ profiles }).speakers[0].introduction).toBe('Their Sessionize bio.')
    })

    it('shows nothing for pronouns a speaker declined to give', () => {
        const declined = [
            {
                ...speakers[0],
                categories: [
                    {
                        id: 3,
                        name: 'Your pronoun',
                        categoryItems: [{ id: 32, name: "I'd rather not answer" }],
                        sort: 1,
                    },
                ],
            },
        ]
        expect(build({ speakers: declined }).speakers[0].pronouns).toBeNull()
        expect(build({ pronouns: undefined }).speakers[0].pronouns).toBeNull()
    })

    it('still shows the session when speakers have given the portal nothing', () => {
        const detail = build({ profiles: new Map(), sessionDetails: null })
        expect(detail.running).toBeNull()
        expect(detail.speakers[0]).toMatchObject({ name: 'Speaker One', pronunciation: null, introduction: null })
    })
})

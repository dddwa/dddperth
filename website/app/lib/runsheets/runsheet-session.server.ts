import type { RunsheetsConfig } from '@ddd/conference-config'
import type { z } from 'zod'
import type { sessionSchema, speakersSchema } from '~/lib/sessionize.server'
import type { SessionDetails, SpeakerProfile } from '~/lib/services/speakers-store'

/**
 * Everything the run sheet's session modal shows: the talk as Sessionize has
 * it, plus what its speakers told us through the speaker portal about running
 * it.
 *
 * `/runsheets` is public, and the portal also holds things speakers gave only
 * to organisers — dietary requirements, RSVPs, contact emails and the
 * free-text "anything else". So this is built field by field from an
 * allowlist rather than by spreading the stored records: a field added to
 * `SpeakerProfile` or `SessionDetails` later stays off the page until someone
 * decides here that it belongs on it.
 */
export interface RunsheetSessionDetail {
    title: string
    description: string | null
    /** Sessionize categories, e.g. `{ name: 'Level', items: ['Introductory'] }`. */
    categories: Array<{ name: string; items: string[] }>
    speakers: Array<{
        name: string
        /** e.g. "She/Her"; null if not given, or declined. */
        pronouns: string | null
        tagLine: string | null
        bio: string | null
        /** How to say their name, if they gave one. */
        pronunciation: string | null
        /** What the MC should say to introduce them, if they've told us. */
        introduction: string | null
    }>
    /** Null until a presenter has filled in the session's details. */
    running: {
        questions: string | null
        presentationNeeds: string[]
    } | null
}

type SessionizeSession = Pick<z.infer<typeof sessionSchema>, 'title' | 'description' | 'categories' | 'speakers'>
type SessionizeSpeaker = Pick<
    z.infer<typeof speakersSchema>[number],
    'id' | 'fullName' | 'bio' | 'tagLine' | 'categories'
>

/** Sessionize's speaker categories are untyped in the schema; this is their shape. */
const isCategory = (value: unknown): value is { name: string; categoryItems: Array<{ name: string }> } =>
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'categoryItems' in value &&
    Array.isArray(value.categoryItems)

function pronounsOf(speaker: SessionizeSpeaker | undefined, config: RunsheetsConfig['speakerPronouns']) {
    if (!speaker || !config) return null
    const category = speaker.categories.filter(isCategory).find((candidate) => candidate.name === config.category)
    const answers = (category?.categoryItems ?? [])
        .map((item) => item.name)
        .filter((answer) => !config.withheldAnswers.includes(answer))
    return answers.length ? answers.join(', ') : null
}

/** Replaces an "Other" choice with the text given for it. */
const withOther = (value: string, other: string | undefined) => (value === 'Other' && other ? other : value)

export function toRunsheetSessionDetail({
    session,
    speakers,
    profiles,
    sessionDetails,
    pronouns,
}: {
    session: SessionizeSession
    /** Sessionize's speaker list; only this session's speakers are read. */
    speakers: SessionizeSpeaker[]
    /** Portal profiles by Sessionize speaker id. */
    profiles: Map<string, SpeakerProfile>
    sessionDetails: SessionDetails | null
    pronouns: RunsheetsConfig['speakerPronouns']
}): RunsheetSessionDetail {
    return {
        title: session.title,
        description: session.description,
        categories: session.categories
            .map((category) => ({ name: category.name, items: category.categoryItems.map((item) => item.name) }))
            .filter((category) => category.items.length > 0),
        speakers: session.speakers.map(({ id, name }) => {
            const speaker = speakers.find((candidate) => candidate.id === id)
            const profile = profiles.get(id)
            const bio = speaker?.bio ?? null
            return {
                name: speaker?.fullName ?? name,
                pronouns: pronounsOf(speaker, pronouns),
                tagLine: speaker?.tagLine ?? null,
                bio,
                pronunciation: profile?.namePhoneticSpelling ?? null,
                introduction: profile
                    ? profile.introductionUseSessionizeBio
                        ? bio
                        : (profile.introductionCustomText ?? null)
                    : null,
            }
        }),
        running: sessionDetails && {
            questions: sessionDetails.questionsPreference
                ? withOther(sessionDetails.questionsPreference, sessionDetails.questionsPreferenceOther)
                : null,
            presentationNeeds: sessionDetails.presentationDetails.map((detail) =>
                withOther(detail, sessionDetails.presentationDetailsOther),
            ),
        },
    }
}

import { LRUCache } from 'lru-cache'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { gridRoomSchema, gridSmartSchema, roomSchema, sessionSchema, timeSlotSchema } from '@ddd/conference-config'
import { conferenceConfigPublic } from '@ddd/conference-config/public'

export { gridRoomSchema, gridSmartSchema, roomSchema, sessionSchema, timeSlotSchema }

const NO_CACHE = process.env.NO_CACHE != null ? process.env.NO_CACHE === 'true' : undefined
// const SPEAKERS_CACHE_KEY = 'speakers'

const scheduleCache = new LRUCache<string, z.infer<typeof gridSmartSchema>>({
    max: 250,
    maxSize: 1024 * 1024 * 12, // 12 mb
    ttl: 1000 * 5, // 5 mins
    sizeCalculation(value, key) {
        return JSON.stringify(value).length + (key ? key.length : 0)
    },
})

const sessionsCache = new LRUCache<string, SessionsList>({
    max: 250,
    maxSize: 1024 * 1024 * 12, // 12 mb
    ttl: 1000 * 5, // 5 mins
    sizeCalculation(value, key) {
        return JSON.stringify(value).length + (key ? key.length : 0)
    },
})
const speakersCache = new LRUCache<string, z.infer<typeof speakersSchema>>({
    max: 250,
    maxSize: 1024 * 1024 * 12, // 12 mb
    ttl: 1000 * 5, // 5 mins
    sizeCalculation(value, key) {
        return JSON.stringify(value).length + (key ? key.length : 0)
    },
})

interface Options {
    sessionizeEndpoint: string
    noCache?: boolean
}

export const sessionsSchema = z.array(
    z.object({
        groupId: z.string().nullable(),
        groupName: z.string().nullable(),
        isDefault: z.boolean(),
        sessions: z.array(sessionSchema),
    }),
)

export type SessionsList = z.infer<typeof sessionsSchema>[number]['sessions']

export const speakersSchema = z.array(
    z.object({
        id: z.string().uuid(),
        firstName: z.string(),
        lastName: z.string(),
        fullName: z.string(),
        bio: z.string().nullable().optional(),
        profilePicture: z.string().url().nullable().optional(),
        tagLine: z.string(),
        sessions: z.array(
            z.object({
                id: z.number(),
                name: z.string(),
            }),
        ),
        isTopSpeaker: z.boolean(),
        links: z.array(
            z.object({
                title: z.string(),
                url: z.string().url(),
                linkType: z.string(),
            }),
        ),
        questionAnswers: z.array(z.any()).optional().default([]),
        categories: z.array(z.any()),
    }),
)

export async function getScheduleGrid(opts: Options): Promise<z.infer<typeof gridSmartSchema>> {
    const { noCache = NO_CACHE ?? false } = opts
    if (!noCache) {
        const cached = scheduleCache.get(opts.sessionizeEndpoint)
        if (cached) {
            return cached
        }
    }

    const fetched = await fetch(`${opts.sessionizeEndpoint}/view/GridSmart`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    if (!fetched.ok) {
        throw new Error('Error fetching schedule, responded with status: ' + fetched.status)
    }
    const json = await fetched.json()
    if (!json || !Array.isArray(json)) {
        throw new Error('Error fetching schedule. Expected an array, received:\n\n' + JSON.stringify(json))
    }

    const schedule = gridSmartSchema.parse(json)

    if (!noCache) {
        scheduleCache.set(opts.sessionizeEndpoint, schedule)
    }

    return schedule
}

export async function getConfSessions(opts: Options): Promise<SessionsList> {
    const { noCache = NO_CACHE ?? false } = opts
    if (!noCache) {
        const cached = sessionsCache.get(opts.sessionizeEndpoint)
        if (cached) {
            return cached
        }
    }

    const fetched = await fetch(`${opts.sessionizeEndpoint}/view/Sessions`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    if (!fetched.ok) {
        throw new Error('Error fetching sessions, responded with status: ' + fetched.status)
    }

    const json = await fetched.json()
    if (!json || !Array.isArray(json)) {
        throw new Error('Error fetching sessions. Expected an array, received:\n\n' + JSON.stringify(json))
    }

    const sessions = sessionsSchema.parse(json)
    const allSessionsGroup = sessions.find((s) => s.groupName === 'All')

    if (!allSessionsGroup) {
        throw new Error(
            'Error fetching sessions. Expected a group named "All", received:\n\n' + JSON.stringify(json, null, 2),
        )
    }

    if (!noCache) {
        sessionsCache.set(opts.sessionizeEndpoint, allSessionsGroup.sessions)
    }

    return allSessionsGroup.sessions
}

export async function getConfSpeakers(opts: Options): Promise<z.infer<typeof speakersSchema>> {
    const { noCache = NO_CACHE ?? false } = opts
    if (!noCache) {
        const cached = speakersCache.get(opts.sessionizeEndpoint)
        if (cached) {
            return cached
        }
    }

    const fetched = await fetch(`${opts.sessionizeEndpoint}/view/Speakers`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    if (!fetched.ok) {
        throw new Error('Error fetching speakers, responded with status: ' + fetched.status)
    }

    const json = await fetched.json()
    if (!json || !Array.isArray(json)) {
        throw new Error('Error fetching speakers. Expected an array, received:\n\n' + JSON.stringify(json))
    }

    const speakers = speakersSchema.parse(json)

    if (!noCache) {
        speakersCache.set(opts.sessionizeEndpoint, speakers)
    }

    return speakers
}

export async function getUnderrepresentedGroups(
    opts: Options & { underrepresentedGroupsQuestionId: number },
): Promise<string[]> {
    const speakers = await getConfSpeakers(opts)

    const groups = new Set<string>()

    for (const speaker of speakers) {
        const group = getSpeakerUnderrepresentedGroup(speaker, opts.underrepresentedGroupsQuestionId)
        if (group) {
            groups.add(group)
        }
    }

    return Array.from(groups).sort()
}

export function getSpeakerUnderrepresentedGroup(
    speaker: z.infer<typeof speakersSchema>[number],
    underrepresentedGroupsQuestionId: number,
): string | undefined {
    const questionAnswer = speaker.questionAnswers?.find((qa) => qa.id === underrepresentedGroupsQuestionId)
    if (questionAnswer?.answer && typeof questionAnswer.answer === 'string') {
        const answer = questionAnswer.answer.trim()
        if (answer.length > 0) {
            return answer
        }
    }

    return undefined
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions): string {
    return DateTime.fromISO(date, { zone: conferenceConfigPublic.timezone }).toLocaleString(opts, { locale: 'en-AU' })
}

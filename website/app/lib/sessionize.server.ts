import { LRUCache } from 'lru-cache'
import { DateTime } from 'luxon'
import { z } from 'zod'

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
const sessionsCache = new LRUCache<string, z.infer<typeof sessionsSchema>>({
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
    confTimeZone: string
    noCache?: boolean
}

const sessionSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.nullable(z.string()),
    startsAt: z.string(),
    endsAt: z.string(),
    isServiceSession: z.boolean(),
    isPlenumSession: z.boolean(),
    speakers: z.array(z.object({ id: z.string(), name: z.string() })),
    categories: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            categoryItems: z.array(z.object({ id: z.number(), name: z.string() })),
            sort: z.number(),
        }),
    ),
    roomId: z.number(),
    room: z.string(),
    liveUrl: z.nullable(z.string()),
    recordingUrl: z.nullable(z.string()),
    status: z.nullable(z.string()),
    isInformed: z.boolean(),
    isConfirmed: z.boolean(),
})

export const roomSchema = z.object({
    id: z.number(),
    name: z.string(),
    session: sessionSchema,
    index: z.number(),
})
export const timeSlotSchema = z.object({
    slotStart: z.string(),
    rooms: z.array(roomSchema),
})
export const gridRoomSchema = z.object({
    id: z.number(),
    name: z.string(),
    sessions: z.array(sessionSchema),
    hasOnlyPlenumSessions: z.boolean(),
})
export const gridSmartSchema = z.array(
    z.object({
        date: z.string(),
        isDefault: z.boolean(),
        rooms: z.array(gridRoomSchema),
        timeSlots: z.array(timeSlotSchema),
    }),
)

export const sessionsSchema = z.array(
    z.object({
        groupId: z.string().nullable(),
        groupName: z.string().nullable(),
        sessions: z.array(sessionSchema),
    }),
)

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
        questionAnswers: z.array(z.any()),
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
        throw new Error('Error fetching schedule. Expected an array, received:\n\n' + json)
    }

    const schedule = gridSmartSchema.parse(json)

    if (!noCache) {
        scheduleCache.set(opts.sessionizeEndpoint, schedule)
    }

    return schedule
}

export async function getConfSessions(opts: Options): Promise<z.infer<typeof sessionsSchema>> {
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
        throw new Error('Error fetching sessions. Expected an array, received:\n\n' + json)
    }

    const sessions = sessionsSchema.parse(json)

    if (!noCache) {
        sessionsCache.set(opts.sessionizeEndpoint, sessions)
    }

    return sessions
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
        throw new Error('Error fetching speakers. Expected an array, received:\n\n' + json)
    }

    const speakers = speakersSchema.parse(json)

    if (!noCache) {
        speakersCache.set(opts.sessionizeEndpoint, speakers)
    }

    return speakers
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions): string {
    return (
        DateTime.fromISO(date)
            // .plus({ minutes: new Date().getTimezoneOffset() })
            .toLocaleString(opts, { locale: 'en-AU' })
    )
}

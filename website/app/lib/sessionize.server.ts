import { LRUCache } from 'lru-cache'
import { DateTime } from 'luxon'
import { z } from 'zod'

const NO_CACHE = process.env.NO_CACHE != null ? process.env.NO_CACHE === 'true' : undefined
// const SPEAKERS_CACHE_KEY = 'speakers'
// const SESSIONS_CACHE_KEY = 'sessions'
const SCHEDULE_CACHE_KEY = 'schedule'
// const SPONSORS_CACHE_KEY = 'sponsors'

const scheduleCache = new LRUCache<'schedule', z.infer<typeof gridSmartSchema>>({
    max: 250,
    maxSize: 1024 * 1024 * 12, // 12 mb
    ttl: 1000 * 60 * 60 * 24, // 24 hours
    sizeCalculation(value, key) {
        return JSON.stringify(value).length + (key ? key.length : 0)
    },
})

interface Options {
    sessionizeEndpoint: string
    confTimeZone: string
    noCache?: boolean
}

// export async function getSpeakers(opts: Options): Promise<Speaker[]> {
//     const { noCache = NO_CACHE ?? false } = opts
//     if (!noCache) {
//         const cached = cache.get(SPEAKERS_CACHE_KEY)
//         if (cached) {
//             return cached as Speaker[]
//         }
//     }

//     const fetch = noCache ? fetchNoCache : fetchNaiveStaleWhileRevalidate
//     const fetched = await fetch(`${opts.sessionizeEndpoint}/view/Speakers`, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//     })
//     if (!fetched.ok) {
//         throw new Error('Error fetching speakers, responded with status: ' + fetched.status)
//     }
//     const json: unknown = await fetched.json()
//     if (!json || !Array.isArray(json)) {
//         throw new Error('Error fetching speakers. Expected an array, received:\n\n' + json)
//     }

//     const speakers = json
//         .map((speaker: unknown) => {
//             try {
//                 validateSessionizeSpeakerData(speaker)
//             } catch (error) {
//                 console.warn(
//                     `Invalid speaker object; skipping.\n\nSee API settings to ensure expected data is included\n\n`,
//                     'Received:\n',
//                     speaker,
//                 )
//                 return null
//             }
//             return modelSpeaker(speaker)
//         })
//         .filter(isNotEmpty)

//     if (!noCache) {
//         cache.set(SPEAKERS_CACHE_KEY, speakers)
//     }
//     return speakers
// }

// export async function getSpeakerBySlug(slug: string, opts: Options): Promise<Speaker | null> {
//     // Unfortunately, Sessionize doesn't have an API for fetching a single speaker,
//     // so we have to fetch all of them and then filter down to the one we want.
//     const speakers = await getSpeakers(opts)
//     const speaker = speakers.find((s) => s.slug === slug)
//     return speaker || null
// }

// export async function getConfSessions(opts: Options): Promise<SpeakerSession[]> {
//     const { noCache = NO_CACHE ?? false } = opts
//     if (!noCache) {
//         const cached = cache.get(SESSIONS_CACHE_KEY)
//         if (cached) {
//             return cached as SpeakerSession[]
//         }
//     }

//     const fetch = noCache ? fetchNoCache : fetchNaiveStaleWhileRevalidate
//     const fetched = await fetch(`${opts.sessionizeEndpoint}/view/Sessions`, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//     })
//     if (!fetched.ok) {
//         throw new Error('Error fetching speakers, responded with status: ' + fetched.status)
//     }
//     const json: unknown = await fetched.json()
//     if (!json || !Array.isArray(json)) {
//         throw new Error('Error fetching speakers. Expected an array, received:\n\n' + json)
//     }

//     const sessions = json
//         .flatMap((sessionGroup: unknown) => {
//             try {
//                 if (
//                     !sessionGroup ||
//                     typeof sessionGroup !== 'object' ||
//                     !('sessions' in sessionGroup) ||
//                     !Array.isArray(sessionGroup.sessions)
//                 ) {
//                     throw null
//                 }

//                 const flatSessions = new Map<string | number, SpeakerSession>()
//                 for (const session of sessionGroup.sessions) {
//                     validateSessionizeSessionData(session)
//                     if (flatSessions.has(session.id)) continue
//                     flatSessions.set(session.id, modelSpeakerSession(session, opts.confTimeZone))
//                 }
//                 return Array.from(flatSessions.values())
//             } catch (error) {
//                 return null
//             }
//         })
//         .filter(isNotEmpty)

//     if (!noCache) {
//         cache.set(SESSIONS_CACHE_KEY, sessions)
//     }
//     return sessions
// }

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

export const gridSmartSchema = z.array(
    z.object({
        date: z.string(),
        isDefault: z.boolean(),
        rooms: z.array(
            z.object({
                id: z.number(),
                name: z.string(),
                sessions: z.array(sessionSchema),
                hasOnlyPlenumSessions: z.boolean(),
            }),
        ),
        timeSlots: z.array(
            z.object({
                slotStart: z.string(),
                rooms: z.array(
                    z.object({
                        id: z.number(),
                        name: z.string(),
                        session: sessionSchema,
                        index: z.number(),
                    }),
                ),
            }),
        ),
    }),
)

export async function getScheduleGrid(opts: Options): Promise<z.infer<typeof gridSmartSchema>> {
    const { noCache = NO_CACHE ?? false } = opts
    if (!noCache) {
        const cached = scheduleCache.get(SCHEDULE_CACHE_KEY)
        if (cached) {
            return cached as z.infer<typeof gridSmartSchema>
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
        scheduleCache.set(SCHEDULE_CACHE_KEY, schedule)
    }

    return schedule
}

// function getDateTime(isoDate: string, confTimeZone: string) {
//     return DateTime.fromISO(isoDate, { zone: confTimeZone }) as DateTime<true>
// }

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions): string {
    return (
        DateTime.fromISO(date)
            // .plus({ minutes: new Date().getTimezoneOffset() })
            .toLocaleString(opts, { locale: 'en-AU' })
    )
}

// function modelSpeaker(speaker: SessionizeSpeakerData): Speaker {
//     const id = String(speaker.id)
//     const { nameFirst, nameLast, nameFull } = getSpeakerNames(speaker)

//     const tagLine = getSpeakerTagLine(speaker)
//     const imgUrl = speaker.profilePicture ? String(speaker.profilePicture) : null
//     const twitterUrl = speaker.links?.find((link) => link.title === 'Twitter')?.url
//     const twitterHandle = twitterUrl?.includes('twitter.com') ? '@' + getTwitterHandle(twitterUrl) : null
//     const bio = speaker.bio
//         ? speaker.bio
//               .split(/[\r\n]+/g)
//               .map((line) => line.trim())
//               .filter(Boolean)
//               .join('\n')
//         : null
//     const isEmcee = speaker.questionAnswers?.find((qa) => qa.question === 'Emcee?')?.answer === 'true'

//     const validatedSpeaker: Speaker = {
//         id,
//         tagLine,
//         bio,
//         nameFirst,
//         nameLast,
//         nameFull,
//         slug: slugify(nameFull),
//         imgUrl,
//         twitterHandle,
//         isTopSpeaker: !!speaker.isTopSpeaker,
//         isEmcee,
//         links: speaker.links || [],
//     }
//     return validatedSpeaker
// }

// function modelSpeakerSession(session: SessionizeSessionData, confTimeZone: string): SpeakerSession {
//     const id = String(session.id)
//     const title = String(session.title).trim()
//     const description = session.description ? String(session.description).trim() : null
//     const startsAt = session.startsAt ? getDateTime(session.startsAt, confTimeZone) : null
//     const endsAt = session.endsAt ? getDateTime(session.endsAt, confTimeZone) : null
//     const speakers =
//         session.speakers && Array.isArray(session.speakers)
//             ? session.speakers.map((speaker) => {
//                   return {
//                       id: speaker.id,
//                       name: speaker.name,
//                       slug: slugify(speaker.name),
//                   }
//               })
//             : []

//     return {
//         id,
//         title,
//         description,
//         startsAt,
//         endsAt,
//         speakers,
//     }
// }

// function getSpeakerNames(speaker: SessionizeSpeakerData) {
//     const preferredName = speaker.questionAnswers?.find((qa) => qa.question === 'Preferred Name')?.answer
//     let nameFirst: string
//     const nameLast = speaker.lastName ? String(speaker.lastName).trim() : ''
//     if (preferredName) {
//         nameFirst = preferredName.includes(nameLast)
//             ? preferredName.slice(0, preferredName.indexOf(nameLast)).trim()
//             : preferredName.trim()
//     } else {
//         nameFirst = speaker.firstName ? String(speaker.firstName).trim() : ''
//     }
//     const nameFull = [nameFirst, nameLast].filter(Boolean).join(' ')

//     return {
//         nameFirst,
//         nameLast,
//         nameFull,
//         preferredName,
//     }
// }

// function getSpeakerTagLine(speaker: SessionizeSpeakerData) {
//     if (speaker.tagLine) {
//         return speaker.tagLine.trim()
//     }
//     let jobTitle: string | undefined | null
//     if ((jobTitle = speaker.questionAnswers?.find((qa) => qa.question === 'Current Job Title')?.answer)) {
//         return jobTitle.trim()
//     }
//     return null
// }

// function getTwitterHandle(url: string) {
//     const match = url.match(/twitter\.com\/([^/]+)/)
//     return match?.[1] || null
// }

// function isNotEmpty<T>(value: T | null | undefined): value is T {
//     return value != null
// }

// async function fetchNoCache(url: string, opts?: RequestInit) {
//     return fetch(url, {
//         ...opts,
//         cache: 'no-cache',
//     })
// }

// // https://developer.mozilla.org/en-US/docs/Web/API/Request/cache#examples
// async function fetchNaiveStaleWhileRevalidate(
//     url: string,
//     opts?: {
//         method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
//         headers: HeadersInit
//     },
// ) {
//     const method = opts?.method || 'GET'
//     const headers = opts?.headers || {}
//     let controller = new AbortController()
//     let res: Response
//     try {
//         res = await fetch(url, {
//             method,
//             headers,
//             cache: 'only-if-cached',
//             signal: controller.signal,
//         })
//     } catch (err) {
//         // Workaround for Chrome, which fails with a TypeError
//         if (err instanceof TypeError && err.message === 'Failed to fetch') {
//             return fetchWithForceCache()
//         }
//         throw err
//     }
//     if (res.status === 504) {
//         return fetchWithForceCache()
//     }

//     const date = res.headers.get('date')
//     const dt = date ? new Date(date).getTime() : 0
//     if (dt < Date.now() - 60 * 60 * 24) {
//         // If older than 24 hours
//         controller.abort()
//         controller = new AbortController()
//         return fetch(url, {
//             method,
//             headers,
//             cache: 'reload',
//             signal: controller.signal,
//         })
//     }

//     if (dt < Date.now() - 60 * 60 * 24 * 7) {
//         // If it's older than 1 week, fetch but don't wait for it. We'll return the
//         // stale value while this call "revalidates"
//         fetch(url, {
//             method,
//             headers,
//             cache: 'no-cache',
//         })
//     }

//     // return possibly stale value
//     return res

//     function fetchWithForceCache() {
//         controller.abort()
//         controller = new AbortController()
//         return fetch(url, {
//             method,
//             headers,
//             cache: 'force-cache',
//             signal: controller.signal,
//         })
//     }
// }

// export async function getSponsors() {
//     const cached = cache.get(SPONSORS_CACHE_KEY)
//     if (isSponsorArray(cached)) {
//         return cached
//     }

//     // const sponsorsRaw = yaml.parse(sponsorsYamlFileContents)
//     const sponsors: Array<Sponsor> = []
//     // for (const sponsorRaw of sponsorsRaw) {
//     //     invariant(
//     //         isSponsor(sponsorRaw),
//     //         `Sponsor ${JSON.stringify(sponsorRaw)} is not valid. Please check the sponsors file.`,
//     //     )
//     //     sponsors.push(sponsorRaw)
//     // }
//     cache.set(SPONSORS_CACHE_KEY, sponsors)

//     return sponsors
// }

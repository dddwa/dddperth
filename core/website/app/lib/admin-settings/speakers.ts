import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { SPEAKER_TRAINING_SESSION_OPTIONS, type SpeakerTrainingSession } from '../services/speakers-store'
import type { SpeakerDinnerInfo, SpeakerTrainingSessionInfo } from '../speakers/checklist'
import { SPEAKER_CHECKLIST_ITEMS, type ChecklistDueDates, type ChecklistItemKey } from '../speakers/checklist-items'

/**
 * The /admin/settings/speakers section: the speaker portal values that change
 * every year (checklist due dates, training sessions, dinner, links, Meet the
 * Experts slots). Until an admin saves them, they come from the fork's
 * `speakerPortal` / `meetTheExperts` config and the
 * `SPEAKER_TICKET_CLAIM_URL_<YEAR>` secret, so an unsaved install behaves
 * exactly as before. Once saved, the stored values replace all of those.
 *
 * Stored as ISO strings (with offset) since it round-trips through JSON;
 * `resolveSpeakerSettings` turns them into the DateTimes the portal uses.
 */

const isoDateTime = z.string().refine((value) => DateTime.fromISO(value).isValid, 'Invalid date/time')

export const speakerSettingsSchema = z.object({
    dueDates: z.partialRecord(z.enum(SPEAKER_CHECKLIST_ITEMS.map((item) => item.key) as [ChecklistItemKey, ...ChecklistItemKey[]]), isoDateTime),
    trainingSessions: z.array(
        z.object({
            id: z.enum(SPEAKER_TRAINING_SESSION_OPTIONS),
            title: z.string().min(1),
            start: isoDateTime,
            end: isoDateTime,
        }),
    ),
    dinner: z.object({ start: isoDateTime, end: isoDateTime, location: z.string().optional() }).optional(),
    infoPackUrl: z.url().optional(),
    ticketClaimUrl: z.url().optional(),
    meetTheExpertsSlots: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })),
})

export type SpeakerSettings = z.infer<typeof speakerSettingsSchema>

export interface ResolvedSpeakerSettings {
    dueDates: ChecklistDueDates
    trainingSessions: SpeakerTrainingSessionInfo[]
    dinner?: SpeakerDinnerInfo
    infoPackUrl?: string
    ticketClaimUrl?: string
    meetTheExpertsSlots: Array<{ id: string; label: string }>
}

const timezone = () => conferenceManifest.public.timezone

function toIso(dateTime: DateTime): string {
    // Only ever handed valid DateTimes, so toISO() can't return null here.
    return dateTime.toISO() ?? ''
}

function fromIso(value: string): DateTime {
    return DateTime.fromISO(value, { zone: timezone() })
}

/** The values currently in the fork's config — what the portal uses until an
 * admin saves this section, and what the settings form starts from. */
export function speakerSettingsFromConfig(ticketClaimUrl: string | undefined): SpeakerSettings {
    const checklist = conferenceManifest.speakerPortal?.checklist
    const dinner = checklist?.speakerDinner
    return {
        dueDates: Object.fromEntries(
            Object.entries(checklist?.dueDates ?? {}).map(([key, dateTime]) => [key, toIso(dateTime)]),
        ),
        trainingSessions: (checklist?.speakerTrainingSessions ?? [])
            .filter((session): session is typeof session & { id: SpeakerTrainingSession } =>
                (SPEAKER_TRAINING_SESSION_OPTIONS as readonly string[]).includes(session.id),
            )
            .map((session) => ({
                id: session.id,
                title: session.title,
                start: toIso(session.dateTime),
                end: toIso(session.endDateTime),
            })),
        dinner: dinner
            ? { start: toIso(dinner.dateTime), end: toIso(dinner.endDateTime), location: dinner.location }
            : undefined,
        infoPackUrl: conferenceManifest.speakerPortal?.infoPackUrl,
        ticketClaimUrl,
        meetTheExpertsSlots: conferenceManifest.meetTheExperts?.slots ?? [],
    }
}

export function resolveSpeakerSettings(settings: SpeakerSettings): ResolvedSpeakerSettings {
    return {
        dueDates: Object.fromEntries(Object.entries(settings.dueDates).map(([key, iso]) => [key, fromIso(iso)])),
        trainingSessions: settings.trainingSessions.map((session) => ({
            id: session.id,
            title: session.title,
            dateTime: fromIso(session.start),
            endDateTime: fromIso(session.end),
        })),
        dinner: settings.dinner && {
            dateTime: fromIso(settings.dinner.start),
            endDateTime: fromIso(settings.dinner.end),
            location: settings.dinner.location,
        },
        infoPackUrl: settings.infoPackUrl,
        ticketClaimUrl: settings.ticketClaimUrl,
        meetTheExpertsSlots: settings.meetTheExpertsSlots,
    }
}

/** ISO → the `yyyy-MM-ddTHH:mm` a `datetime-local` input takes, in the
 * conference's timezone (not the admin's browser's). */
export function toDateTimeLocal(iso: string | undefined): string {
    return iso ? fromIso(iso).toFormat("yyyy-MM-dd'T'HH:mm") : ''
}

const asText = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '')
const text = (formData: FormData, name: string) => asText(formData.get(name))

/**
 * The settings form → a value to save, or the problems with it. Blank fields
 * mean "not set": a training session with no title, a dinner with no start, a
 * slot with no label are all left out. `newSlotId` exists so tests can pin
 * the ids given to new slots.
 */
export function parseSpeakerSettingsForm(
    formData: FormData,
    newSlotId: () => string = () => `slot-${crypto.randomUUID().slice(0, 8)}`,
): { value: SpeakerSettings } | { errors: string[] } {
    const errors: string[] = []

    const dateTime = (name: string, label: string): string | undefined => {
        const raw = text(formData, name)
        if (!raw) return undefined
        const parsed = DateTime.fromISO(raw, { zone: timezone() })
        if (!parsed.isValid) {
            errors.push(`${label}: not a valid date/time`)
            return undefined
        }
        return toIso(parsed)
    }

    const startAndEnd = (prefix: string, label: string) => {
        const start = dateTime(`${prefix}.start`, `${label} start`)
        const end = dateTime(`${prefix}.end`, `${label} end`)
        if (!start || !end) {
            errors.push(`${label}: needs both a start and an end`)
            return undefined
        }
        if (fromIso(end) <= fromIso(start)) {
            errors.push(`${label}: end must be after start`)
            return undefined
        }
        return { start, end }
    }

    const dueDates: SpeakerSettings['dueDates'] = {}
    for (const item of SPEAKER_CHECKLIST_ITEMS) {
        const due = dateTime(`dueDate.${item.key}`, `${item.label} due date`)
        if (due) dueDates[item.key] = due
    }

    const trainingSessions: SpeakerSettings['trainingSessions'] = []
    for (const id of SPEAKER_TRAINING_SESSION_OPTIONS) {
        const title = text(formData, `training.${id}.title`)
        if (!title) continue
        const times = startAndEnd(`training.${id}`, `Training ${id}`)
        if (times) trainingSessions.push({ id, title, ...times })
    }

    const dinnerTimes = text(formData, 'dinner.start') || text(formData, 'dinner.end')
        ? startAndEnd('dinner', 'Speaker dinner')
        : undefined
    const dinnerLocation = text(formData, 'dinner.location')
    const dinner = dinnerTimes && { ...dinnerTimes, location: dinnerLocation || undefined }

    const url = (name: string, label: string): string | undefined => {
        const raw = text(formData, name)
        if (!raw) return undefined
        if (!z.url().safeParse(raw).success) {
            errors.push(`${label}: not a valid URL`)
            return undefined
        }
        return raw
    }
    const infoPackUrl = url('infoPackUrl', 'Info pack URL')
    const ticketClaimUrl = url('ticketClaimUrl', 'Ticket claim URL')

    const slotIds = formData.getAll('slot.id').map(asText)
    const meetTheExpertsSlots = formData
        .getAll('slot.label')
        .map((label, i) => ({ id: slotIds[i] || newSlotId(), label: asText(label) }))
        .filter((slot) => slot.label)

    if (errors.length > 0) return { errors }
    return {
        value: { dueDates, trainingSessions, dinner, infoPackUrl, ticketClaimUrl, meetTheExpertsSlots },
    }
}

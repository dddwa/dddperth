import { conferenceManifest } from '@conference/manifest'
import { recordException } from '../../record-exception'
import { getConfSessions, getConfSpeakers } from '../../sessionize.server'
import {
    resolveSpeakerPortalSessionizeEndpoint,
    toPortalSession,
    toPortalSpeaker,
    type PortalSessionContent,
    type PortalSpeakerContent,
} from '../../speakers/map-sessionize'
import type { AppConfig } from '../app-config'
import type {
    PresentationDetail,
    QuestionsPreference,
    SessionDetails,
    SpeakerListEntry,
    SpeakerProfile,
    SpeakerRecord,
    SpeakersStore,
    SpeakerSession,
    SpeakerSyncRun,
    SpeakerTrainingSession,
    SpeakerWorkspace,
    YesNoMaybe,
    YesNoMaybeOther,
} from '../speakers-store'

interface SpeakerRow {
    sessionize_id: string
    year: string
    active: number
}

interface SpeakerSessionRow {
    sessionize_speaker_id: string
    sessionize_session_id: string
}

/** Used when a linked id isn't found in the live Sessionize payload — either
 * Sessionize is unreachable, or the id was removed there since the last
 * hourly sync caught up. Keeps the portal's checklist/RSVP flows usable
 * instead of erroring the whole page out. */
function placeholderSpeaker(sessionizeId: string): PortalSpeakerContent {
    return { fullName: sessionizeId, links: [] }
}

function placeholderSession(sessionizeSessionId: string): PortalSessionContent {
    return { sessionTitle: sessionizeSessionId, talkTopics: [], status: 'Unknown', isConfirmed: false }
}

interface SpeakerProfileRow {
    sessionize_id: string
    name_phonetic_spelling: string | null
    introduction_use_sessionize_bio: number
    introduction_custom_text: string | null
    dietary_requirements: string | null
    rsvp_speakers_dinner: string | null
    rsvp_speaker_training_json: string | null
    rsvp_speaker_training_responded_at: number | null
    register_meet_the_experts: string | null
    register_meet_the_experts_other: string | null
    register_meet_the_experts_slots_json: string | null
    register_meet_the_experts_responded_at: number | null
    meet_the_experts_bio_use_sessionize_bio: number
    meet_the_experts_bio_custom_text: string | null
    completed_at: number | null
    updated_at: number
    updated_by: string
    ticket_claimed_at: number | null
    session_confirmed_reported_at: number | null
}

interface SessionDetailsRow {
    sessionize_session_id: string
    questions_preference: string | null
    questions_preference_other: string | null
    presentation_details_json: string | null
    presentation_details_other: string | null
    opt_out_of_recording: number
    anything_else: string | null
    updated_at: number
    updated_by: string
}

interface SyncRunRow {
    id: number
    trigger_source: string
    started_at: number
    finished_at: number | null
    status: string
    speakers_upserted: number | null
    speakers_deactivated: number | null
    error: string | null
}

/** Parses a JSON array column, tolerating null/corrupt values so a bad row
 * can't take the whole dashboard down. */
function parseJsonArray(json: string | null): string[] {
    if (!json) return []
    try {
        const value: unknown = JSON.parse(json)
        return Array.isArray(value) ? (value as string[]) : []
    } catch {
        return []
    }
}

function toSpeaker(row: SpeakerRow, content: PortalSpeakerContent): SpeakerRecord {
    return {
        sessionizeId: row.sessionize_id,
        year: row.year,
        fullName: content.fullName,
        tagLine: content.tagLine,
        bio: content.bio,
        profilePictureUrl: content.profilePictureUrl,
        links: content.links,
        active: row.active === 1,
    }
}

function toSession(row: SpeakerSessionRow, content: PortalSessionContent): SpeakerSession {
    return {
        sessionizeSessionId: row.sessionize_session_id,
        sessionTitle: content.sessionTitle,
        description: content.description,
        format: content.format,
        level: content.level,
        generalTopic: content.generalTopic,
        talkTopics: content.talkTopics,
        startsAt: content.startsAt,
        endsAt: content.endsAt,
        roomName: content.roomName,
        status: content.status,
        isConfirmed: content.isConfirmed,
    }
}

/** Every speaker/session's live Sessionize content, keyed by id — fetched
 * once per store call and merged with D1 rows by the caller. Reuses
 * sessionize.server.ts's own 5-minute cache, so this rarely hits the network.
 * Falls back to an empty map (every id resolves to a placeholder) rather
 * than throwing, so a Sessionize outage degrades the portal's display
 * content instead of breaking its checklist/RSVP flows outright. */
async function fetchLiveContent(
    config: AppConfig,
): Promise<{ speakers: Map<string, PortalSpeakerContent>; sessions: Map<string, PortalSessionContent> }> {
    const empty = { speakers: new Map<string, PortalSpeakerContent>(), sessions: new Map<string, PortalSessionContent>() }

    const sessionizeEndpoint = resolveSpeakerPortalSessionizeEndpoint(config)
    const categoryNames = conferenceManifest.speakerPortal?.sessionizeCategoryNames
    if (!sessionizeEndpoint || !categoryNames) return empty

    try {
        const [speakers, sessions] = await Promise.all([
            getConfSpeakers({ sessionizeEndpoint }),
            getConfSessions({ sessionizeEndpoint }),
        ])
        return {
            speakers: new Map(speakers.map((s) => [s.id, toPortalSpeaker(s)])),
            sessions: new Map(sessions.map((s) => [s.id, toPortalSession(s, categoryNames)])),
        }
    } catch (error) {
        recordException(error)
        return empty
    }
}

function toProfile(row: SpeakerProfileRow): SpeakerProfile {
    return {
        sessionizeId: row.sessionize_id,
        namePhoneticSpelling: row.name_phonetic_spelling ?? undefined,
        introductionUseSessionizeBio: row.introduction_use_sessionize_bio === 1,
        introductionCustomText: row.introduction_custom_text ?? undefined,
        dietaryRequirements: row.dietary_requirements ?? undefined,
        rsvpSpeakersDinner: (row.rsvp_speakers_dinner as YesNoMaybe | null) ?? undefined,
        rsvpSpeakerTraining: parseJsonArray(row.rsvp_speaker_training_json) as SpeakerTrainingSession[],
        rsvpSpeakerTrainingRespondedAt: row.rsvp_speaker_training_responded_at ?? undefined,
        registerMeetTheExperts: (row.register_meet_the_experts as YesNoMaybeOther | null) ?? undefined,
        registerMeetTheExpertsOther: row.register_meet_the_experts_other ?? undefined,
        registerMeetTheExpertsSlots: parseJsonArray(row.register_meet_the_experts_slots_json),
        registerMeetTheExpertsRespondedAt: row.register_meet_the_experts_responded_at ?? undefined,
        meetTheExpertsBioUseSessionizeBio: row.meet_the_experts_bio_use_sessionize_bio === 1,
        meetTheExpertsBioCustomText: row.meet_the_experts_bio_custom_text ?? undefined,
        completedAt: row.completed_at ?? undefined,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
        ticketClaimedAt: row.ticket_claimed_at ?? undefined,
        sessionConfirmedReportedAt: row.session_confirmed_reported_at ?? undefined,
    }
}

function toSessionDetails(row: SessionDetailsRow): SessionDetails {
    return {
        sessionizeSessionId: row.sessionize_session_id,
        questionsPreference: (row.questions_preference as QuestionsPreference | null) ?? undefined,
        questionsPreferenceOther: row.questions_preference_other ?? undefined,
        presentationDetails: parseJsonArray(row.presentation_details_json) as PresentationDetail[],
        presentationDetailsOther: row.presentation_details_other ?? undefined,
        optOutOfRecording: row.opt_out_of_recording === 1,
        anythingElse: row.anything_else ?? undefined,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
    }
}

function toSyncRun(row: SyncRunRow): SpeakerSyncRun {
    return {
        id: row.id,
        trigger: row.trigger_source === 'cron' ? 'cron' : 'manual',
        startedAt: row.started_at,
        finishedAt: row.finished_at ?? undefined,
        status: row.status as SpeakerSyncRun['status'],
        speakersUpserted: row.speakers_upserted ?? undefined,
        speakersDeactivated: row.speakers_deactivated ?? undefined,
        error: row.error ?? undefined,
    }
}

export function createD1SpeakersStore(args: { db: D1Database; config: AppConfig }): SpeakersStore {
    const { db, config } = args

    return {
        async isSpeakerContact(email) {
            const row = await db
                .prepare(
                    `SELECT 1 FROM speaker_contacts c
                     JOIN speakers s ON s.sessionize_id = c.sessionize_id AND s.active = 1
                     WHERE c.email = ? LIMIT 1`,
                )
                .bind(email.toLowerCase())
                .first()
            return row !== null
        },

        async getSpeakerForEmail(email) {
            const row = await db
                .prepare(
                    `SELECT s.* FROM speakers s
                     JOIN speaker_contacts c ON c.sessionize_id = s.sessionize_id
                     WHERE c.email = ? AND s.active = 1
                     ORDER BY s.sessionize_id ASC LIMIT 1`,
                )
                .bind(email.toLowerCase())
                .first<SpeakerRow>()
            if (!row) return null
            const live = await fetchLiveContent(config)
            return toSpeaker(row, live.speakers.get(row.sessionize_id) ?? placeholderSpeaker(row.sessionize_id))
        },

        async getSpeaker(sessionizeId) {
            const row = await db
                .prepare(`SELECT * FROM speakers WHERE sessionize_id = ?`)
                .bind(sessionizeId)
                .first<SpeakerRow>()
            if (!row) return null
            const live = await fetchLiveContent(config)
            return toSpeaker(row, live.speakers.get(sessionizeId) ?? placeholderSpeaker(sessionizeId))
        },

        async getContactEmails(sessionizeId) {
            const result = await db
                .prepare(`SELECT email FROM speaker_contacts WHERE sessionize_id = ? ORDER BY email`)
                .bind(sessionizeId)
                .all<{ email: string }>()
            return (result.results ?? []).map((r) => r.email)
        },

        async addContact(sessionizeId, email) {
            await db
                .prepare(
                    `INSERT OR IGNORE INTO speaker_contacts (email, sessionize_id, created_at)
                     VALUES (?, ?, unixepoch())`,
                )
                .bind(email.toLowerCase(), sessionizeId)
                .run()
        },

        async removeContact(sessionizeId, email) {
            await db
                .prepare(`DELETE FROM speaker_contacts WHERE email = ? AND sessionize_id = ?`)
                .bind(email.toLowerCase(), sessionizeId)
                .run()
        },

        async getProfile(sessionizeId) {
            const row = await db
                .prepare(`SELECT * FROM speaker_profiles WHERE sessionize_id = ?`)
                .bind(sessionizeId)
                .first<SpeakerProfileRow>()
            return row ? toProfile(row) : null
        },

        async getSessionDetails(sessionizeSessionId) {
            const row = await db
                .prepare(`SELECT * FROM session_details WHERE sessionize_session_id = ?`)
                .bind(sessionizeSessionId)
                .first<SessionDetailsRow>()
            return row ? toSessionDetails(row) : null
        },

        async getCoPresenterIds(sessionizeId) {
            const result = await db
                .prepare(
                    `SELECT DISTINCT other.sessionize_speaker_id AS id
                     FROM speaker_sessions mine
                     JOIN speaker_sessions other ON other.sessionize_session_id = mine.sessionize_session_id
                     WHERE mine.sessionize_speaker_id = ?`,
                )
                .bind(sessionizeId)
                .all<{ id: string }>()

            const ids = new Set((result.results ?? []).map((r) => r.id))
            ids.add(sessionizeId) // a speaker on no shared session is still their own co-presenter set
            return [...ids]
        },

        async isSpeakerOnSession(sessionizeId, sessionizeSessionId) {
            const row = await db
                .prepare(
                    `SELECT 1 FROM speaker_sessions
                     WHERE sessionize_speaker_id = ? AND sessionize_session_id = ? LIMIT 1`,
                )
                .bind(sessionizeId, sessionizeSessionId)
                .first()
            return row !== null
        },

        async getWorkspace(sessionizeId) {
            const speakerRow = await db
                .prepare(`SELECT * FROM speakers WHERE sessionize_id = ?`)
                .bind(sessionizeId)
                .first<SpeakerRow>()
            if (!speakerRow) return null

            const mySessions = await db
                .prepare(`SELECT * FROM speaker_sessions WHERE sessionize_speaker_id = ?`)
                .bind(sessionizeId)
                .all<SpeakerSessionRow>()

            const live = await fetchLiveContent(config)
            const speaker = toSpeaker(speakerRow, live.speakers.get(sessionizeId) ?? placeholderSpeaker(sessionizeId))

            // Sort by live start time now that it isn't a D1 column to `ORDER BY`
            // — undefined (waitlisted, no slot yet) sorts first, same as before.
            const sessionRows = [...(mySessions.results ?? [])].sort((a, b) => {
                const aStarts = live.sessions.get(a.sessionize_session_id)?.startsAt ?? ''
                const bStarts = live.sessions.get(b.sessionize_session_id)?.startsAt ?? ''
                return aStarts.localeCompare(bStarts)
            })

            const workspace: SpeakerWorkspace = { speaker, sessions: [] }

            for (const sessionRow of sessionRows) {
                const presenterRows = await db
                    .prepare(
                        `SELECT sp.* FROM speaker_sessions ss
                         JOIN speakers sp ON sp.sessionize_id = ss.sessionize_speaker_id
                         WHERE ss.sessionize_session_id = ?`,
                    )
                    .bind(sessionRow.sessionize_session_id)
                    .all<SpeakerRow>()

                const presenters = await Promise.all(
                    (presenterRows.results ?? []).map(async (row) => ({
                        speaker: toSpeaker(row, live.speakers.get(row.sessionize_id) ?? placeholderSpeaker(row.sessionize_id)),
                        profile: await this.getProfile(row.sessionize_id),
                    })),
                )

                workspace.sessions.push({
                    session: toSession(
                        sessionRow,
                        live.sessions.get(sessionRow.sessionize_session_id) ??
                            placeholderSession(sessionRow.sessionize_session_id),
                    ),
                    sessionDetails: await this.getSessionDetails(sessionRow.sessionize_session_id),
                    presenters,
                })
            }

            return workspace
        },

        async listSpeakers(year) {
            const [speakersResult, contacts, sessions, profiles, sessionDetailsRows, live] = await Promise.all([
                db.prepare(`SELECT * FROM speakers WHERE year = ?`).bind(year).all<SpeakerRow>(),
                db
                    .prepare(
                        `SELECT c.email, c.sessionize_id FROM speaker_contacts c
                         JOIN speakers s ON s.sessionize_id = c.sessionize_id WHERE s.year = ?`,
                    )
                    .bind(year)
                    .all<{ email: string; sessionize_id: string }>(),
                db
                    .prepare(
                        `SELECT ss.* FROM speaker_sessions ss
                         JOIN speakers s ON s.sessionize_id = ss.sessionize_speaker_id WHERE s.year = ?`,
                    )
                    .bind(year)
                    .all<SpeakerSessionRow>(),
                db
                    .prepare(
                        `SELECT p.* FROM speaker_profiles p
                         JOIN speakers s ON s.sessionize_id = p.sessionize_id WHERE s.year = ?`,
                    )
                    .bind(year)
                    .all<SpeakerProfileRow>(),
                db
                    .prepare(
                        `SELECT DISTINCT sd.sessionize_session_id, sd.questions_preference
                         FROM session_details sd
                         JOIN speaker_sessions ss ON ss.sessionize_session_id = sd.sessionize_session_id
                         JOIN speakers s ON s.sessionize_id = ss.sessionize_speaker_id WHERE s.year = ?`,
                    )
                    .bind(year)
                    .all<{ sessionize_session_id: string; questions_preference: string | null }>(),
                fetchLiveContent(config),
            ])

            const contactsBySpeaker = new Map<string, string[]>()
            for (const c of contacts.results ?? []) {
                const list = contactsBySpeaker.get(c.sessionize_id) ?? []
                list.push(c.email)
                contactsBySpeaker.set(c.sessionize_id, list)
            }
            const sessionsBySpeaker = new Map<string, SpeakerSession[]>()
            for (const s of sessions.results ?? []) {
                const list = sessionsBySpeaker.get(s.sessionize_speaker_id) ?? []
                list.push(toSession(s, live.sessions.get(s.sessionize_session_id) ?? placeholderSession(s.sessionize_session_id)))
                sessionsBySpeaker.set(s.sessionize_speaker_id, list)
            }
            const profileBySpeaker = new Map((profiles.results ?? []).map((p) => [p.sessionize_id, toProfile(p)]))
            const sessionDetailsCompleteById = new Map(
                (sessionDetailsRows.results ?? []).map((r) => [r.sessionize_session_id, Boolean(r.questions_preference)]),
            )

            const entries = (speakersResult.results ?? []).map((row): SpeakerListEntry => {
                const speakerSessions = sessionsBySpeaker.get(row.sessionize_id) ?? []
                return {
                    ...toSpeaker(row, live.speakers.get(row.sessionize_id) ?? placeholderSpeaker(row.sessionize_id)),
                    contacts: contactsBySpeaker.get(row.sessionize_id) ?? [],
                    sessions: speakerSessions,
                    profile: profileBySpeaker.get(row.sessionize_id) ?? null,
                    sessionDetailsComplete: Object.fromEntries(
                        speakerSessions.map((s) => [
                            s.sessionizeSessionId,
                            sessionDetailsCompleteById.get(s.sessionizeSessionId) ?? false,
                        ]),
                    ),
                }
            })

            // Was `ORDER BY full_name` in SQL — full_name is no longer a D1
            // column, so sort the live-merged list instead.
            entries.sort((a, b) => a.fullName.localeCompare(b.fullName))
            return entries
        },

        async getAllSpeakersForSync() {
            const result = await db.prepare(`SELECT sessionize_id, active FROM speakers`).all<{
                sessionize_id: string
                active: number
            }>()
            return (result.results ?? []).map((r) => ({ sessionizeId: r.sessionize_id, active: r.active === 1 }))
        },

        async getAllSpeakerSessions() {
            const result = await db
                .prepare(`SELECT sessionize_speaker_id, sessionize_session_id FROM speaker_sessions`)
                .all<{ sessionize_speaker_id: string; sessionize_session_id: string }>()
            return (result.results ?? []).map((r) => ({
                sessionizeSpeakerId: r.sessionize_speaker_id,
                sessionizeSessionId: r.sessionize_session_id,
            }))
        },

        async saveProfile(sessionizeId, details, updatedBy) {
            // Deliberately doesn't touch dietary_requirements / rsvp_speakers_dinner /
            // rsvp_speaker_training_json / rsvp_speaker_training_responded_at /
            // register_meet_the_experts_slots_json / register_meet_the_experts_responded_at
            // — those are owned by saveSpeakerDinnerRsvp / saveSpeakerTrainingRsvp /
            // saveMeetTheExpertsSlots now, so a session-details save can never
            // clobber an RSVP already on file.
            await db
                .prepare(
                    `INSERT INTO speaker_profiles
                         (sessionize_id, name_phonetic_spelling, introduction_use_sessionize_bio,
                          introduction_custom_text, register_meet_the_experts,
                          register_meet_the_experts_other, updated_at, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, unixepoch(), ?)
                     ON CONFLICT(sessionize_id) DO UPDATE SET
                         name_phonetic_spelling = excluded.name_phonetic_spelling,
                         introduction_use_sessionize_bio = excluded.introduction_use_sessionize_bio,
                         introduction_custom_text = excluded.introduction_custom_text,
                         register_meet_the_experts = excluded.register_meet_the_experts,
                         register_meet_the_experts_other = excluded.register_meet_the_experts_other,
                         updated_at = excluded.updated_at,
                         updated_by = excluded.updated_by`,
                )
                .bind(
                    sessionizeId,
                    details.namePhoneticSpelling ?? null,
                    details.introductionUseSessionizeBio ? 1 : 0,
                    details.introductionCustomText ?? null,
                    details.registerMeetTheExperts ?? null,
                    details.registerMeetTheExpertsOther ?? null,
                    updatedBy,
                )
                .run()
        },

        async saveSessionDetails(sessionizeSessionId, details, updatedBy) {
            await db
                .prepare(
                    `INSERT INTO session_details
                         (sessionize_session_id, questions_preference, questions_preference_other,
                          presentation_details_json, presentation_details_other, opt_out_of_recording,
                          anything_else, updated_at, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), ?)
                     ON CONFLICT(sessionize_session_id) DO UPDATE SET
                         questions_preference = excluded.questions_preference,
                         questions_preference_other = excluded.questions_preference_other,
                         presentation_details_json = excluded.presentation_details_json,
                         presentation_details_other = excluded.presentation_details_other,
                         opt_out_of_recording = excluded.opt_out_of_recording,
                         anything_else = excluded.anything_else,
                         updated_at = excluded.updated_at,
                         updated_by = excluded.updated_by`,
                )
                .bind(
                    sessionizeSessionId,
                    details.questionsPreference ?? null,
                    details.questionsPreferenceOther ?? null,
                    details.presentationDetails.length > 0 ? JSON.stringify(details.presentationDetails) : null,
                    details.presentationDetailsOther ?? null,
                    details.optOutOfRecording ? 1 : 0,
                    details.anythingElse ?? null,
                    updatedBy,
                )
                .run()
        },

        async saveMeetTheExpertsSlots(sessionizeId, details, updatedBy) {
            await db
                .prepare(
                    `INSERT INTO speaker_profiles
                         (sessionize_id, register_meet_the_experts_slots_json,
                          register_meet_the_experts_responded_at,
                          meet_the_experts_bio_use_sessionize_bio, meet_the_experts_bio_custom_text,
                          updated_at, updated_by)
                     VALUES (?, ?, unixepoch(), ?, ?, unixepoch(), ?)
                     ON CONFLICT(sessionize_id) DO UPDATE SET
                         register_meet_the_experts_slots_json = excluded.register_meet_the_experts_slots_json,
                         register_meet_the_experts_responded_at = excluded.register_meet_the_experts_responded_at,
                         meet_the_experts_bio_use_sessionize_bio = excluded.meet_the_experts_bio_use_sessionize_bio,
                         meet_the_experts_bio_custom_text = excluded.meet_the_experts_bio_custom_text`,
                )
                .bind(
                    sessionizeId,
                    details.slots.length > 0 ? JSON.stringify(details.slots) : null,
                    details.bioUseSessionizeBio ? 1 : 0,
                    details.bioCustomText ?? null,
                    updatedBy,
                )
                .run()
        },

        async markProfileCompleted(sessionizeId) {
            const result = await db
                .prepare(
                    `UPDATE speaker_profiles SET completed_at = unixepoch()
                     WHERE sessionize_id = ? AND completed_at IS NULL`,
                )
                .bind(sessionizeId)
                .run()
            return (result.meta.changes ?? 0) > 0
        },

        async markTicketClaimed(sessionizeId, updatedBy) {
            // No profile row may exist yet — insert a bare one (satisfying
            // the NOT NULL audit columns) or, if it does, only set the
            // timestamp the first time, leaving the rest of the row (and its
            // updated_at/updated_by audit trail) untouched.
            await db
                .prepare(
                    `INSERT INTO speaker_profiles (sessionize_id, ticket_claimed_at, updated_at, updated_by)
                     VALUES (?, unixepoch(), unixepoch(), ?)
                     ON CONFLICT(sessionize_id) DO UPDATE SET
                         ticket_claimed_at = COALESCE(speaker_profiles.ticket_claimed_at, unixepoch())`,
                )
                .bind(sessionizeId, updatedBy)
                .run()
        },

        async saveSpeakerTrainingRsvp(sessionizeId, sessions, updatedBy) {
            // Unlike markTicketClaimed, an RSVP can be resubmitted with a
            // different selection — so both columns are overwritten on every
            // call, not just set-once. Only these two columns are touched.
            await db
                .prepare(
                    `INSERT INTO speaker_profiles
                         (sessionize_id, rsvp_speaker_training_json, rsvp_speaker_training_responded_at,
                          updated_at, updated_by)
                     VALUES (?, ?, unixepoch(), unixepoch(), ?)
                     ON CONFLICT(sessionize_id) DO UPDATE SET
                         rsvp_speaker_training_json = excluded.rsvp_speaker_training_json,
                         rsvp_speaker_training_responded_at = excluded.rsvp_speaker_training_responded_at`,
                )
                .bind(sessionizeId, sessions.length > 0 ? JSON.stringify(sessions) : null, updatedBy)
                .run()
        },

        async saveSpeakerDinnerRsvp(sessionizeId, response, dietaryRequirements, updatedBy) {
            await db
                .prepare(
                    `INSERT INTO speaker_profiles
                         (sessionize_id, rsvp_speakers_dinner, dietary_requirements, updated_at, updated_by)
                     VALUES (?, ?, ?, unixepoch(), ?)
                     ON CONFLICT(sessionize_id) DO UPDATE SET
                         rsvp_speakers_dinner = excluded.rsvp_speakers_dinner,
                         dietary_requirements = excluded.dietary_requirements`,
                )
                .bind(sessionizeId, response, dietaryRequirements ?? null, updatedBy)
                .run()
        },

        async markSessionConfirmed(sessionizeId, updatedBy) {
            // Same idiom as markTicketClaimed, but we need to know whether
            // *this* call did the stamping — the caller only sends the
            // notification email the first time.
            const before = await db
                .prepare(`SELECT session_confirmed_reported_at FROM speaker_profiles WHERE sessionize_id = ?`)
                .bind(sessionizeId)
                .first<{ session_confirmed_reported_at: number | null }>()
            if (before?.session_confirmed_reported_at) return false

            await db
                .prepare(
                    `INSERT INTO speaker_profiles (sessionize_id, session_confirmed_reported_at, updated_at, updated_by)
                     VALUES (?, unixepoch(), unixepoch(), ?)
                     ON CONFLICT(sessionize_id) DO UPDATE SET
                         session_confirmed_reported_at = COALESCE(speaker_profiles.session_confirmed_reported_at, unixepoch())`,
                )
                .bind(sessionizeId, updatedBy)
                .run()
            return true
        },

        async applySyncPlan(plan) {
            const statements: D1PreparedStatement[] = []

            for (const s of plan.upserts) {
                statements.push(
                    db
                        .prepare(
                            `INSERT INTO speakers (sessionize_id, year, active, created_at, updated_at)
                             VALUES (?, ?, 1, unixepoch(), unixepoch())
                             ON CONFLICT(sessionize_id) DO UPDATE SET
                                 year = excluded.year,
                                 active = 1,
                                 updated_at = excluded.updated_at`,
                        )
                        .bind(s.sessionizeId, s.year),
                )
            }
            for (const sessionizeId of plan.deactivateSessionizeIds) {
                statements.push(
                    db
                        .prepare(`UPDATE speakers SET active = 0, updated_at = unixepoch() WHERE sessionize_id = ?`)
                        .bind(sessionizeId),
                )
            }
            for (const s of plan.sessionUpserts) {
                statements.push(
                    db
                        .prepare(
                            `INSERT INTO speaker_sessions (sessionize_speaker_id, sessionize_session_id, updated_at)
                             VALUES (?, ?, unixepoch())
                             ON CONFLICT(sessionize_speaker_id, sessionize_session_id) DO UPDATE SET
                                 updated_at = excluded.updated_at`,
                        )
                        .bind(s.sessionizeSpeakerId, s.sessionizeSessionId),
                )
            }
            for (const r of plan.sessionRemovals) {
                statements.push(
                    db
                        .prepare(
                            `DELETE FROM speaker_sessions
                             WHERE sessionize_speaker_id = ? AND sessionize_session_id = ?`,
                        )
                        .bind(r.sessionizeSpeakerId, r.sessionizeSessionId),
                )
            }
            if (statements.length > 0) {
                await db.batch(statements)
            }

            return {
                speakersUpserted: plan.upserts.length,
                speakersDeactivated: plan.deactivateSessionizeIds.length,
            }
        },

        async startSyncRun(trigger) {
            const row = await db
                .prepare(
                    `INSERT INTO speaker_sync_runs (trigger_source, started_at, status)
                     VALUES (?, unixepoch(), 'running') RETURNING id`,
                )
                .bind(trigger)
                .first<{ id: number }>()
            if (!row) throw new Error('Failed to record speaker sync run')
            return row.id
        },

        async finishSyncRun(id, result) {
            await db
                .prepare(
                    `UPDATE speaker_sync_runs SET
                         finished_at = unixepoch(),
                         status = ?,
                         speakers_upserted = ?,
                         speakers_deactivated = ?,
                         error = ?
                     WHERE id = ?`,
                )
                .bind(
                    result.status,
                    result.speakersUpserted ?? null,
                    result.speakersDeactivated ?? null,
                    result.error ?? null,
                    id,
                )
                .run()
        },

        async getLatestSyncRun() {
            const row = await db
                .prepare(`SELECT * FROM speaker_sync_runs ORDER BY id DESC LIMIT 1`)
                .first<SyncRunRow>()
            return row ? toSyncRun(row) : null
        },
    }
}

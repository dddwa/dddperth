import type {
    PresentationDetail,
    QuestionsPreference,
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
    full_name: string
    tag_line: string | null
    bio: string | null
    profile_picture_url: string | null
    links_json: string | null
    active: number
}

interface SpeakerSessionRow {
    sessionize_speaker_id: string
    sessionize_session_id: string
    session_title: string
    description: string | null
    format: string | null
    level: string | null
    general_topic: string | null
    talk_topics_json: string | null
    starts_at: string | null
    ends_at: string | null
    room_name: string | null
    status: string
    is_confirmed: number
}

interface SpeakerProfileRow {
    sessionize_id: string
    name_phonetic_spelling: string | null
    questions_preference: string | null
    questions_preference_other: string | null
    presentation_details_json: string | null
    presentation_details_other: string | null
    opt_out_of_recording: number
    introduction_use_sessionize_bio: number
    introduction_custom_text: string | null
    anything_else: string | null
    dietary_requirements: string | null
    rsvp_speakers_dinner: string | null
    rsvp_speaker_training_json: string | null
    rsvp_speaker_training_responded_at: number | null
    register_meet_the_experts: string | null
    register_meet_the_experts_other: string | null
    register_meet_the_experts_slots_json: string | null
    completed_at: number | null
    updated_at: number
    updated_by: string
    ticket_claimed_at: number | null
    session_confirmed_reported_at: number | null
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

function toSpeaker(row: SpeakerRow): SpeakerRecord {
    let links: SpeakerRecord['links'] = []
    if (row.links_json) {
        try {
            const value: unknown = JSON.parse(row.links_json)
            if (Array.isArray(value)) links = value as SpeakerRecord['links']
        } catch {
            // Corrupt JSON shouldn't take the profile page down.
        }
    }
    return {
        sessionizeId: row.sessionize_id,
        year: row.year,
        fullName: row.full_name,
        tagLine: row.tag_line ?? undefined,
        bio: row.bio ?? undefined,
        profilePictureUrl: row.profile_picture_url ?? undefined,
        links,
        active: row.active === 1,
    }
}

function toSession(row: SpeakerSessionRow): SpeakerSession {
    return {
        sessionizeSessionId: row.sessionize_session_id,
        sessionTitle: row.session_title,
        description: row.description ?? undefined,
        format: row.format ?? undefined,
        level: row.level ?? undefined,
        generalTopic: row.general_topic ?? undefined,
        talkTopics: parseJsonArray(row.talk_topics_json),
        startsAt: row.starts_at ?? undefined,
        endsAt: row.ends_at ?? undefined,
        roomName: row.room_name ?? undefined,
        status: row.status,
        isConfirmed: row.is_confirmed === 1,
    }
}

function toProfile(row: SpeakerProfileRow): SpeakerProfile {
    return {
        sessionizeId: row.sessionize_id,
        namePhoneticSpelling: row.name_phonetic_spelling ?? undefined,
        questionsPreference: (row.questions_preference as QuestionsPreference | null) ?? undefined,
        questionsPreferenceOther: row.questions_preference_other ?? undefined,
        presentationDetails: parseJsonArray(row.presentation_details_json) as PresentationDetail[],
        presentationDetailsOther: row.presentation_details_other ?? undefined,
        optOutOfRecording: row.opt_out_of_recording === 1,
        introductionUseSessionizeBio: row.introduction_use_sessionize_bio === 1,
        introductionCustomText: row.introduction_custom_text ?? undefined,
        anythingElse: row.anything_else ?? undefined,
        dietaryRequirements: row.dietary_requirements ?? undefined,
        rsvpSpeakersDinner: (row.rsvp_speakers_dinner as YesNoMaybe | null) ?? undefined,
        rsvpSpeakerTraining: parseJsonArray(row.rsvp_speaker_training_json) as SpeakerTrainingSession[],
        rsvpSpeakerTrainingRespondedAt: row.rsvp_speaker_training_responded_at ?? undefined,
        registerMeetTheExperts: (row.register_meet_the_experts as YesNoMaybeOther | null) ?? undefined,
        registerMeetTheExpertsOther: row.register_meet_the_experts_other ?? undefined,
        registerMeetTheExpertsSlots: parseJsonArray(row.register_meet_the_experts_slots_json),
        completedAt: row.completed_at ?? undefined,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
        ticketClaimedAt: row.ticket_claimed_at ?? undefined,
        sessionConfirmedReportedAt: row.session_confirmed_reported_at ?? undefined,
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

export function createD1SpeakersStore(db: D1Database): SpeakersStore {
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
            return row ? toSpeaker(row) : null
        },

        async getSpeaker(sessionizeId) {
            const row = await db
                .prepare(`SELECT * FROM speakers WHERE sessionize_id = ?`)
                .bind(sessionizeId)
                .first<SpeakerRow>()
            return row ? toSpeaker(row) : null
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

        async getWorkspace(sessionizeId) {
            const speaker = await this.getSpeaker(sessionizeId)
            if (!speaker) return null

            const mySessions = await db
                .prepare(`SELECT * FROM speaker_sessions WHERE sessionize_speaker_id = ? ORDER BY starts_at`)
                .bind(sessionizeId)
                .all<SpeakerSessionRow>()

            const workspace: SpeakerWorkspace = { speaker, sessions: [] }

            for (const sessionRow of mySessions.results ?? []) {
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
                        speaker: toSpeaker(row),
                        profile: await this.getProfile(row.sessionize_id),
                    })),
                )

                workspace.sessions.push({ session: toSession(sessionRow), presenters })
            }

            return workspace
        },

        async listSpeakers(year) {
            const [speakers, contacts, sessions, profiles] = await Promise.all([
                db.prepare(`SELECT * FROM speakers WHERE year = ? ORDER BY full_name`).bind(year).all<SpeakerRow>(),
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
                list.push(toSession(s))
                sessionsBySpeaker.set(s.sessionize_speaker_id, list)
            }
            const profileBySpeaker = new Map((profiles.results ?? []).map((p) => [p.sessionize_id, toProfile(p)]))

            return (speakers.results ?? []).map(
                (row): SpeakerListEntry => ({
                    ...toSpeaker(row),
                    contacts: contactsBySpeaker.get(row.sessionize_id) ?? [],
                    sessions: sessionsBySpeaker.get(row.sessionize_id) ?? [],
                    profile: profileBySpeaker.get(row.sessionize_id) ?? null,
                }),
            )
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
            // Deliberately doesn't touch rsvp_speakers_dinner /
            // rsvp_speaker_training_json / rsvp_speaker_training_responded_at
            // — those are owned by saveSpeakerDinnerRsvp / saveSpeakerTrainingRsvp
            // now, so a session-details save can never clobber an RSVP already
            // on file.
            await db
                .prepare(
                    `INSERT INTO speaker_profiles
                         (sessionize_id, name_phonetic_spelling, questions_preference, questions_preference_other,
                          presentation_details_json, presentation_details_other, opt_out_of_recording,
                          introduction_use_sessionize_bio, introduction_custom_text, anything_else,
                          dietary_requirements, register_meet_the_experts, register_meet_the_experts_other,
                          register_meet_the_experts_slots_json, updated_at, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), ?)
                     ON CONFLICT(sessionize_id) DO UPDATE SET
                         name_phonetic_spelling = excluded.name_phonetic_spelling,
                         questions_preference = excluded.questions_preference,
                         questions_preference_other = excluded.questions_preference_other,
                         presentation_details_json = excluded.presentation_details_json,
                         presentation_details_other = excluded.presentation_details_other,
                         opt_out_of_recording = excluded.opt_out_of_recording,
                         introduction_use_sessionize_bio = excluded.introduction_use_sessionize_bio,
                         introduction_custom_text = excluded.introduction_custom_text,
                         anything_else = excluded.anything_else,
                         dietary_requirements = excluded.dietary_requirements,
                         register_meet_the_experts = excluded.register_meet_the_experts,
                         register_meet_the_experts_other = excluded.register_meet_the_experts_other,
                         register_meet_the_experts_slots_json = excluded.register_meet_the_experts_slots_json,
                         updated_at = excluded.updated_at,
                         updated_by = excluded.updated_by`,
                )
                .bind(
                    sessionizeId,
                    details.namePhoneticSpelling ?? null,
                    details.questionsPreference ?? null,
                    details.questionsPreferenceOther ?? null,
                    details.presentationDetails.length > 0 ? JSON.stringify(details.presentationDetails) : null,
                    details.presentationDetailsOther ?? null,
                    details.optOutOfRecording ? 1 : 0,
                    details.introductionUseSessionizeBio ? 1 : 0,
                    details.introductionCustomText ?? null,
                    details.anythingElse ?? null,
                    details.dietaryRequirements ?? null,
                    details.registerMeetTheExperts ?? null,
                    details.registerMeetTheExpertsOther ?? null,
                    details.registerMeetTheExpertsSlots.length > 0
                        ? JSON.stringify(details.registerMeetTheExpertsSlots)
                        : null,
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

        async saveSpeakerDinnerRsvp(sessionizeId, response, updatedBy) {
            await db
                .prepare(
                    `INSERT INTO speaker_profiles (sessionize_id, rsvp_speakers_dinner, updated_at, updated_by)
                     VALUES (?, ?, unixepoch(), ?)
                     ON CONFLICT(sessionize_id) DO UPDATE SET
                         rsvp_speakers_dinner = excluded.rsvp_speakers_dinner`,
                )
                .bind(sessionizeId, response, updatedBy)
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
                            `INSERT INTO speakers
                                 (sessionize_id, year, full_name, tag_line, bio, profile_picture_url, links_json,
                                  active, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, 1, unixepoch(), unixepoch())
                             ON CONFLICT(sessionize_id) DO UPDATE SET
                                 year = excluded.year,
                                 full_name = excluded.full_name,
                                 tag_line = excluded.tag_line,
                                 bio = excluded.bio,
                                 profile_picture_url = excluded.profile_picture_url,
                                 links_json = excluded.links_json,
                                 active = 1,
                                 updated_at = excluded.updated_at`,
                        )
                        .bind(
                            s.sessionizeId,
                            s.year,
                            s.fullName,
                            s.tagLine ?? null,
                            s.bio ?? null,
                            s.profilePictureUrl ?? null,
                            s.links.length > 0 ? JSON.stringify(s.links) : null,
                        ),
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
                            `INSERT INTO speaker_sessions
                                 (sessionize_speaker_id, sessionize_session_id, session_title, description, format,
                                  level, general_topic, talk_topics_json, starts_at, ends_at, room_name, status,
                                  is_confirmed, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
                             ON CONFLICT(sessionize_speaker_id, sessionize_session_id) DO UPDATE SET
                                 session_title = excluded.session_title,
                                 description = excluded.description,
                                 format = excluded.format,
                                 level = excluded.level,
                                 general_topic = excluded.general_topic,
                                 talk_topics_json = excluded.talk_topics_json,
                                 starts_at = excluded.starts_at,
                                 ends_at = excluded.ends_at,
                                 room_name = excluded.room_name,
                                 status = excluded.status,
                                 is_confirmed = excluded.is_confirmed,
                                 updated_at = excluded.updated_at`,
                        )
                        .bind(
                            s.sessionizeSpeakerId,
                            s.sessionizeSessionId,
                            s.sessionTitle,
                            s.description ?? null,
                            s.format ?? null,
                            s.level ?? null,
                            s.generalTopic ?? null,
                            s.talkTopics.length > 0 ? JSON.stringify(s.talkTopics) : null,
                            s.startsAt ?? null,
                            s.endsAt ?? null,
                            s.roomName ?? null,
                            s.status,
                            s.isConfirmed ? 1 : 0,
                        ),
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

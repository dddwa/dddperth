import type { MeetTheExpertsRegistration, MeetTheExpertsRegistrantType, MeetTheExpertsStore } from '../meet-the-experts-store'

interface MeetTheExpertsRegistrationRow {
    registrant_type: string
    registrant_id: string
    slots_json: string | null
    bio_use_default: number
    bio_custom_text: string | null
    responded_at: number
    updated_at: number
    updated_by: string
}

/** Parses a JSON array column, tolerating null/corrupt values so a bad row
 * can't take the whole dashboard down. Duplicated from d1-speakers-store's
 * helper of the same name rather than shared — both are tiny and each store
 * stays independently readable. */
function parseJsonArray(json: string | null): string[] {
    if (!json) return []
    try {
        const value: unknown = JSON.parse(json)
        return Array.isArray(value) ? (value as string[]) : []
    } catch {
        return []
    }
}

function toRegistration(row: MeetTheExpertsRegistrationRow): MeetTheExpertsRegistration {
    return {
        registrantType: row.registrant_type as MeetTheExpertsRegistrantType,
        registrantId: row.registrant_id,
        slots: parseJsonArray(row.slots_json),
        bioUseDefault: row.bio_use_default === 1,
        bioCustomText: row.bio_custom_text ?? undefined,
        respondedAt: row.responded_at,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
    }
}

export function createD1MeetTheExpertsStore(db: D1Database): MeetTheExpertsStore {
    return {
        async getRegistration(registrantType, registrantId) {
            const row = await db
                .prepare(`SELECT * FROM meet_the_experts_registrations WHERE registrant_type = ? AND registrant_id = ?`)
                .bind(registrantType, registrantId)
                .first<MeetTheExpertsRegistrationRow>()
            return row ? toRegistration(row) : null
        },

        async listRegistrations() {
            const { results } = await db
                .prepare(`SELECT * FROM meet_the_experts_registrations`)
                .all<MeetTheExpertsRegistrationRow>()
            return results.map(toRegistration)
        },

        async saveRegistration(registrantType, registrantId, details, updatedBy) {
            await db
                .prepare(
                    `INSERT INTO meet_the_experts_registrations
                         (registrant_type, registrant_id, slots_json, bio_use_default, bio_custom_text,
                          responded_at, updated_at, updated_by)
                     VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch(), ?)
                     ON CONFLICT(registrant_type, registrant_id) DO UPDATE SET
                         slots_json = excluded.slots_json,
                         bio_use_default = excluded.bio_use_default,
                         bio_custom_text = excluded.bio_custom_text,
                         responded_at = excluded.responded_at,
                         updated_at = excluded.updated_at,
                         updated_by = excluded.updated_by`,
                )
                .bind(
                    registrantType,
                    registrantId,
                    details.slots.length > 0 ? JSON.stringify(details.slots) : null,
                    details.bioUseDefault ? 1 : 0,
                    details.bioCustomText ?? null,
                    updatedBy,
                )
                .run()
        },
    }
}

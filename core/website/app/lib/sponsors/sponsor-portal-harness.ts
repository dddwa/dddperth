import type { SponsorPortalConfig } from '@ddd/conference-config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { AppConfig } from '../services/app-config'
import type { AssetStorage } from '../services/asset-storage'
import { createD1SponsorsStore } from '../services/cloudflare/d1-sponsors-store.server'
import { createJiraSponsorSyncService } from '../services/cloudflare/jira-sponsor-sync.server'
import type { EmailService } from '../services/email-service'
import type { NotificationLog } from '../services/notification-log'
import type { SponsorSyncService } from '../services/sponsor-sync-service'
import type { SponsorsStore } from '../services/sponsors-store'
import type { ExhibitorLogistics, JiraClient, SponsorDeliverables } from './jira-client.server'
import { buildLogisticsPayload } from './jira-client.server'
import {
    CHECKBOX_GROUP_KEYS,
    logisticsVisibility,
    prefilledLogistics,
    readSubmittedLogistics,
    visibleLogisticsKeys,
    type LogisticsVisibility,
} from './logistics'
import { prefilledProfileFields } from './profile'
import { sponsorProgress } from './progress'

/** The manifest's Jira field mapping, which the fake resolves ids through. */
type JiraFields = SponsorPortalConfig['jira']['fields']

/**
 * Wires the sponsor portal's real collaborators together over an in-memory
 * database and an in-memory Jira, so a test can drive the whole cycle:
 * sync → sponsor saves → committee edits Jira → sync again.
 *
 * **Why this exists.** Every bug this module has shipped lived in a *seam*,
 * not in a unit. The worst of them — a portal save nulling every Jira
 * logistics value the committee had gathered — had full unit coverage on both
 * sides: `planJiraFieldValue` was tested, the route action was tested, and the
 * bug was in which keys the caller passed between them. Mocking the store or
 * the Jira client would have reproduced the same blind spot, so this harness
 * fakes neither:
 *
 *   - **The database is real SQL.** `node:sqlite` in memory, built by running
 *     the actual migration files, driven through the actual `createD1SponsorsStore`.
 *     A column added to a migration but missed in the upsert fails here.
 *   - **Jira is a store, not a mock.** `FakeJira` holds issue fields in a Map
 *     that writes actually mutate, so "the committee edited this between syncs"
 *     is expressible — which is the whole point of a two-way sync test. Writes
 *     go through the production `buildLogisticsPayload`, including its
 *     `editmeta` type conversion, so a payload bug surfaces as wrong data in
 *     Jira rather than as a passing assertion about a mock call.
 *
 * What it does *not* cover: HTTP, auth, and React. Route actions are thin
 * wrappers that derive `submittedKeys` and call these services, and
 * `saveLogisticsForm` below mirrors that derivation — see its comment for the
 * one piece of route logic duplicated here, and why.
 */

const MIGRATIONS = [
    '0004_sponsor_portal.sql',
    '0019_sponsor_logistics.sql',
    '0020_sponsor_logistics_submitted.sql',
    '0021_sponsor_jira_prefill.sql',
    '0022_sponsor_jira_logistics_prefill.sql',
    '0023_sponsor_two_way_sync.sql',
    '0024_sponsor_exhibitor_room.sql',
] as const

/** Runs the store's real SQL against its real migrations. */
export function d1FromSqlite(sqlite: DatabaseSync): D1Database {
    const statementApi = (sql: string, params: Array<string | number | null>) => ({
        bind: (...args: Array<string | number | null>) => statementApi(sql, args),
        first: <T>() => Promise.resolve((sqlite.prepare(sql).get(...params) ?? null) as T | null),
        all: <T>() => Promise.resolve({ results: sqlite.prepare(sql).all(...params) as T[] }),
        run: () => {
            const result = sqlite.prepare(sql).run(...params)
            return Promise.resolve({ meta: { changes: Number(result.changes) } })
        },
    })
    return {
        prepare: (sql: string) => statementApi(sql, []),
        batch: async (statements: Array<ReturnType<typeof statementApi>>) => {
            sqlite.exec('BEGIN')
            try {
                const results = []
                for (const statement of statements) results.push(await statement.run())
                sqlite.exec('COMMIT')
                return results
            } catch (error) {
                sqlite.exec('ROLLBACK')
                throw error
            }
        },
    } as unknown as D1Database
}

export function migrate(sqlite: DatabaseSync, name: string) {
    sqlite.exec(readFileSync(join(import.meta.dirname, '../../../migrations', name), 'utf8'))
}

export function migratedSqlite(names: readonly string[] = MIGRATIONS): DatabaseSync {
    const sqlite = new DatabaseSync(':memory:')
    for (const name of names) migrate(sqlite, name)
    return sqlite
}

/**
 * Jira field types as the real SPN project reports them through `editmeta`.
 *
 * `buildLogisticsPayload` branches on these, and the branches genuinely
 * differ: an `option` clears to `null` and a checkbox array clears to `[]`, so
 * a harness that called everything a string would silently agree with a broken
 * implementation. Keyed by portal field name; the harness resolves the Jira
 * custom field id through the manifest exactly as production does.
 */
const FIELD_TYPES: Record<string, { type: string; custom?: string; allowedValues?: string[] }> = {
    bumpInSlot: { type: 'option', allowedValues: ['Friday 1pm - 2pm', 'Friday 4pm - 5pm', 'Friday noon - 1pm'] },
    bumpOutWindow: { type: 'option', allowedValues: ['Saturday 4pm', 'Saturday 5pm (after conference concludes)'] },
    raffleLocation: { type: 'option', allowedValues: ['Exhibition Space', 'Raffle Give-away on main stage'] },
    parking: { type: 'array', allowedValues: ['For Bump In', 'For Bump Out'] },
    screenOrders: { type: 'array', allowedValues: ['55" LCD ($500+GST)', '65" LCD ($600+GST)'] },
    socialQuote: { type: 'string', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textarea' },
}

/** Jira returns a chosen single-select option as `{ id }`. */
function isOptionRef(value: unknown): value is { id: string } {
    return typeof value === 'object' && value !== null && 'id' in value
}

/** Rich-text fields arrive as an ADF document. */
function isAdfDocument(value: unknown): value is { type: 'doc' } {
    return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'doc'
}

export interface FakeJiraIssue {
    companyName: string
    tier: string
    contactEmails: string[]
    website?: string
    /** Website Blurb — the committee's copy, prefills the portal. */
    quote?: string
    socials?: Record<string, string>
    /** Keyed by portal field name, e.g. `bumpInSlot`. */
    logistics?: Record<string, string>
    exhibitorRoom?: string
    freeTicketCount?: string
    ticketClaimUrl?: string
    assetsRequired?: string
    assetUploadUrl?: string
    /** Custom field id → option id, for the workstream status flips. */
    statuses?: Record<string, string>
}

/**
 * An in-memory Jira whose writes stick.
 *
 * Tests mutate `issues` directly to play the committee ("Aaron edits the blurb
 * in Jira"), then run a sync and assert what the portal sees. A mock that only
 * recorded calls could not express that at all.
 */
export class FakeJira {
    readonly issues = new Map<string, FakeJiraIssue>()
    /** Every `updateIssueFields` payload, for asserting on what was *not* sent. */
    readonly writes: Array<{ issueKey: string; fields: Record<string, unknown> }> = []
    /** Set to make every write throw, standing in for a Jira outage. Reads
     * keep working, which is the shape of a 5xx on the write endpoints. */
    failWrites: Error | undefined

    constructor(private readonly fields: JiraFields) {}

    private logisticsMapping(): Record<string, string | undefined> {
        return this.fields.logistics ?? {}
    }

    private editMetaFields(): Record<
        string,
        { schema?: { type?: string; custom?: string }; allowedValues?: unknown[] }
    > {
        const meta: Record<string, { schema?: { type?: string; custom?: string }; allowedValues?: unknown[] }> = {}
        for (const [portalKey, fieldId] of Object.entries(this.fields.logistics ?? {})) {
            if (typeof fieldId !== 'string' || fieldId === '') continue
            const spec = FIELD_TYPES[portalKey] ?? { type: 'string' }
            meta[fieldId] = {
                schema: { type: spec.type, custom: spec.custom },
                allowedValues: spec.allowedValues?.map((value, index) => ({ id: String(index + 1), value })),
            }
        }
        return meta
    }

    client(): JiraClient {
        const { issues, writes, fields } = this
        const editMetaFields = () => this.editMetaFields()
        const logisticsMapping = () => this.logisticsMapping()
        const optionValue = (fieldId: string, option: { id: string }) => this.optionValue(fieldId, option)
        const adfToText = (value: unknown) => this.adfToText(value)
        // Read through `this` on every call, so a test can set it after the
        // client has been handed to the services.
        const failWrites = () => {
            if (this.failWrites) throw this.failWrites
        }

        return {
            async searchSponsorIssues() {
                return [...issues.entries()].map(([issueKey, issue]) => ({
                    issueKey,
                    companyName: issue.companyName,
                    tier: issue.tier,
                    website: issue.website,
                    contactEmails: issue.contactEmails,
                    hasYearLabel: true,
                    quote: issue.quote,
                    socials: issue.socials && Object.keys(issue.socials).length > 0 ? { ...issue.socials } : undefined,
                    logistics:
                        issue.logistics && Object.keys(issue.logistics).length > 0 ? { ...issue.logistics } : undefined,
                    // Enumerating configured keys is what lets a Jira-side
                    // *clear* propagate: a cleared field is simply absent from
                    // the response, so values alone can't distinguish it from
                    // "never set".
                    logisticsKeys: Object.entries(logisticsMapping())
                        .filter(([, id]) => typeof id === 'string' && id !== '')
                        .map(([portalKey]) => portalKey),
                    detailsKeys: [
                        'websiteUrl',
                        ...(fields.quote ? ['blurb'] : []),
                        ...Object.keys(fields.socials ?? {}).map((platform) => `social_${platform}`),
                    ],
                    exhibitorRoom: issue.exhibitorRoom,
                }))
            },

            async getStatusOptionId(issueKey, fieldId) {
                return issues.get(issueKey)?.statuses?.[fieldId]
            },

            async setStatusOptionId(issueKey, fieldId, optionId) {
                failWrites()
                const issue = issues.get(issueKey)
                if (!issue) return
                issue.statuses = { ...(issue.statuses ?? {}), [fieldId]: optionId }
            },

            async addLabel() {},

            async getExhibitorLogistics() {
                const map = new Map<string, ExhibitorLogistics>()
                for (const [issueKey, issue] of issues) map.set(issueKey, { ...(issue.logistics ?? {}) })
                return map
            },

            async pushLogistics(issueKey, logistics, submittedKeys) {
                // The production payload builder, including its editmeta type
                // conversion — so a bug there shows up as wrong data in Jira,
                // not as a passing assertion about a mock.
                const payload = buildLogisticsPayload({
                    mapping: logisticsMapping(),
                    editMetaFields: editMetaFields(),
                    logistics,
                    submittedKeys,
                })
                if (Object.keys(payload).length === 0) return

                const issue = issues.get(issueKey)
                if (!issue) return
                writes.push({ issueKey, fields: payload })

                const next = { ...(issue.logistics ?? {}) }
                for (const [portalKey, fieldId] of Object.entries(logisticsMapping())) {
                    if (typeof fieldId !== 'string' || !(fieldId in payload)) continue
                    const value = payload[fieldId]

                    // Mirrors how Jira stores each payload shape back as text.
                    // Every branch is explicit and an unknown shape throws: a
                    // fake that quietly stored "[object Object]" would let a
                    // test pass against data Jira could never hold.
                    if (value === null || (Array.isArray(value) && value.length === 0)) {
                        delete next[portalKey]
                    } else if (Array.isArray(value)) {
                        next[portalKey] = value
                            .map((option) => optionValue(fieldId, option as { id: string }))
                            .join(', ')
                    } else if (isOptionRef(value)) {
                        next[portalKey] = optionValue(fieldId, value)
                    } else if (isAdfDocument(value)) {
                        next[portalKey] = adfToText(value)
                    } else if (typeof value === 'string') {
                        next[portalKey] = value
                    } else {
                        throw new Error(
                            `FakeJira cannot store ${JSON.stringify(value)} for "${portalKey}" — ` +
                                'the payload builder produced a shape this fake does not model.',
                        )
                    }
                }
                issue.logistics = next
            },

            async addComment() {},
            async addAttachment() {},

            async updateIssueFields(issueKey, fieldValues) {
                failWrites()
                const issue = issues.get(issueKey)
                if (!issue) return
                writes.push({ issueKey, fields: fieldValues })

                for (const [fieldId, value] of Object.entries(fieldValues)) {
                    if (fieldId === fields.website) issue.website = (value as string) ?? undefined
                    else if (fieldId === fields.quote) {
                        issue.quote = value === null ? undefined : adfToText(value)
                    } else {
                        for (const [platform, socialId] of Object.entries(fields.socials ?? {})) {
                            if (socialId !== fieldId) continue
                            const socials = { ...(issue.socials ?? {}) }
                            if (value === null) delete socials[platform]
                            else socials[platform] = value as string
                            issue.socials = socials
                        }
                    }
                }
            },

            async getSponsorDeliverables(issueKey) {
                const issue = issues.get(issueKey)
                const deliverables: SponsorDeliverables = {
                    freeTicketCount: issue?.freeTicketCount,
                    ticketClaimUrl: issue?.ticketClaimUrl,
                    assetsRequired: issue?.assetsRequired,
                    assetUploadUrl: issue?.assetUploadUrl,
                    exhibitorRoom: issue?.exhibitorRoom,
                }
                return deliverables
            },
        }
    }

    private optionValue(fieldId: string, option: { id: string }): string {
        const meta = this.editMetaFields()[fieldId]
        const match = (meta?.allowedValues ?? []).find((allowed) => (allowed as { id: string }).id === option.id) as
            { value: string } | undefined
        return match?.value ?? ''
    }

    private adfToText(value: unknown): string {
        const texts: string[] = []
        const walk = (node: unknown): void => {
            if (!node || typeof node !== 'object') return
            const n = node as { text?: unknown; content?: unknown }
            if (typeof n.text === 'string') texts.push(n.text)
            if (Array.isArray(n.content)) n.content.forEach(walk)
        }
        walk(value)
        return texts.join(' ')
    }
}

export interface SponsorPortalHarness {
    jira: FakeJira
    store: SponsorsStore
    sync: SponsorSyncService
    /** Runs a full sync, as the cron and the admin button both do. */
    runSync(): Promise<void>
    /** What `/portal/profile` would render for this sponsor. */
    profileForm(issueKey: string): Promise<{ blurb: string; websiteUrl: string; socials: Record<string, string> }>
    /** What `/portal/logistics` would render for this sponsor. */
    logisticsForm(issueKey: string): Promise<Record<string, string>>
    /** What the dashboard checklist would show: section key → progress. */
    dashboardProgress(issueKey: string): Promise<Record<string, { done: number; total: number; complete: boolean }>>
    /** The profile form's save action: Jira first, then D1. Throws as it does. */
    saveProfileForm(
        issueKey: string,
        details: { blurb: string; websiteUrl: string; socials: Record<string, string> },
    ): Promise<void>
    /** The logistics form's save action. `submitted` names the fields that
     * were on the form, which is what separates "cleared" from "never asked". */
    saveLogisticsForm(issueKey: string, fields: Record<string, string>, submitted: string[]): Promise<void>
    close(): void
}

export function createSponsorPortalHarness(args: {
    portalConfig: SponsorPortalConfig
    issues?: Record<string, FakeJiraIssue>
}): SponsorPortalHarness {
    const sqlite = migratedSqlite()
    const store = createD1SponsorsStore(d1FromSqlite(sqlite))
    const jira = new FakeJira(args.portalConfig.jira.fields)
    for (const [issueKey, issue] of Object.entries(args.issues ?? {})) jira.issues.set(issueKey, { ...issue })

    const config: AppConfig = {
        webUrl: 'https://example.test',
        sessionSecret: 'test',
        websiteAuthRequired: false,
        useSponsorFixtures: false,
        auth: { emailFrom: 'test@example.com' },
        sessionizeOverrides: {},
        speakerTicketClaimUrls: {},
        tito: {},
        // Writeback on with an injected client: the point is to exercise the
        // write path, and the fake Jira is the only thing it can reach.
        jira: { writebackEnabled: true, stub: false },
    }

    const assets: AssetStorage = {
        async put() {},
        async get() {
            return null
        },
        async delete() {},
    }
    const email: EmailService = { canSend: () => false, async send() {} }
    // Already-sent, so the token-expiry reminder never fires mid-test.
    const notifications: NotificationLog = {
        async wasSent() {
            return true
        },
        async markSent() {},
    }

    const sync = createJiraSponsorSyncService({
        config,
        sponsors: store,
        assets,
        email,
        notifications,
        jiraClient: jira.client(),
    })

    const visibilityFor = async (issueKey: string): Promise<LogisticsVisibility> => {
        const sponsor = await store.getSponsor(issueKey)
        return logisticsVisibility(args.portalConfig.jira.tierMap?.[sponsor?.tier ?? ''])
    }

    return {
        jira,
        store,
        sync,

        async runSync() {
            const outcome = await sync.syncNow('manual')
            if (!outcome.ok) throw new Error(`sync failed: ${outcome.reason} ${outcome.error ?? ''}`)
            await sync.retryPendingStatusFlips()
        },

        async profileForm(issueKey) {
            const [sponsor, profile] = await Promise.all([store.getSponsor(issueKey), store.getProfile(issueKey)])
            return prefilledProfileFields({
                profile,
                jira: { quote: sponsor?.jiraQuote, website: sponsor?.website, socials: sponsor?.jiraSocials },
            })
        },

        async logisticsForm(issueKey) {
            const [sponsor, profile] = await Promise.all([store.getSponsor(issueKey), store.getProfile(issueKey)])
            return prefilledLogistics({ profile, jiraLogistics: sponsor?.jiraLogistics })
        },

        async dashboardProgress(issueKey) {
            const [sponsor, profile] = await Promise.all([store.getSponsor(issueKey), store.getProfile(issueKey)])
            const sections = sponsorProgress({
                profile,
                sponsor,
                visibility: await visibilityFor(issueKey),
                // Not what this seam is for; fixed so it never colours a
                // progress assertion.
                meetTheExpertsResponded: false,
                meetTheExpertsOffered: false,
            })
            return Object.fromEntries(
                sections.map((section) => [
                    section.key,
                    { done: section.done, total: section.total, complete: section.complete },
                ]),
            )
        },

        async saveProfileForm(issueKey, details) {
            await sync.pushSponsorDetails(issueKey, details)
            await store.saveDetails(issueKey, details, 'sponsor@example.com')
        },

        async saveLogisticsForm(issueKey, fields, submitted) {
            // Builds the FormData a browser would post — repeated `name[]` for
            // the checkbox groups, plus the hidden presence marker the form
            // renders — and runs the route's own `readSubmittedLogistics`.
            //
            // The previous version took the submitted-key set as an argument,
            // which is precisely why it missed the bug the browser found: the
            // route derives that set from form data, and a hand-kept copy of
            // the derivation cannot disagree with itself.
            const formData = new FormData()
            for (const key of submitted) {
                const value = fields[key] ?? ''
                if ((CHECKBOX_GROUP_KEYS as readonly string[]).includes(key)) {
                    formData.set(`${key}__present`, '1')
                    for (const option of value
                        .split(',')
                        .map((part) => part.trim())
                        .filter(Boolean)) {
                        formData.append(`${key}[]`, option)
                    }
                } else {
                    formData.set(key, value)
                }
            }

            const submittedKeys = readSubmittedLogistics(formData)
            const seeable = visibleLogisticsKeys(await visibilityFor(issueKey))
            const visibleSubmittedKeys = new Set([...submittedKeys].filter((key) => seeable.has(key)))

            const answered: Record<string, string> = {}
            for (const key of submittedKeys) {
                const value = formData.get(key)
                if (typeof value === 'string' && value !== '' && seeable.has(key)) answered[key] = value
            }

            await sync.pushLogistics(issueKey, answered, visibleSubmittedKeys)
            await store.saveLogistics(issueKey, answered, 'sponsor@example.com')
        },

        close() {
            sqlite.close()
        },
    }
}

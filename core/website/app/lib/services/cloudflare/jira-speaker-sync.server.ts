import { conferenceManifest } from '@conference/manifest'
import type { sessionSchema, SpeakerPortalJiraConfig } from '@ddd/conference-config'
import type { z } from 'zod'
import { getYearConfig } from '../../get-year-config.server'
import { getConfSessions, getConfSpeakers } from '../../sessionize.server'
import type { JiraClient } from '../../speakers/jira-client.server'
import { createJiraClient } from '../../speakers/jira-client.server'
import { createStubJiraClient } from '../../speakers/stub-jira-client.server'
import { computeSpeakerSyncPlan, type SyncSourceSession } from '../../speakers/sync-plan'
import type { AppConfig } from '../app-config'
import type { SpeakerSyncService } from '../speaker-sync-service'
import type { SpeakerProfile, SpeakersStore } from '../speakers-store'

/**
 * If a sync run has been "running" longer than this it's considered crashed
 * (the worker died mid-run) and a new run may start over it.
 */
const STALE_RUN_SECONDS = 5 * 60

type Session = z.infer<typeof sessionSchema>

/** All category-item names under the category matching `categoryName`
 * (case-sensitive, matched on Sessionize's own category name). Empty array
 * if the category doesn't exist on this session — a category set up after
 * some sessions were submitted shouldn't break the sync. */
function categoryValues(session: Session, categoryName: string): string[] {
    const category = session.categories.find((c) => c.name === categoryName)
    return category ? category.categoryItems.map((item) => item.name) : []
}

/** Single-select convenience — first value, if any. */
function categoryValue(session: Session, categoryName: string): string | undefined {
    return categoryValues(session, categoryName)[0]
}

/** Renders a choice + its "Other" free-text companion as one readable Jira
 * field value, e.g. "Other: interpretive dance" or just "Yes, moderated". */
function withOther(choice: string | undefined, other: string | undefined): string | undefined {
    if (!choice) return undefined
    return choice === 'Other' && other ? `Other: ${other}` : choice
}

/** Builds the Jira field payload for a speaker's submitted extra info.
 * Omits any field the fork hasn't configured a Jira field id for. */
function buildProfileWritebackPayload(
    profile: SpeakerProfile,
    fields: SpeakerPortalJiraConfig['fields'],
): Record<string, unknown> {
    const payload: Record<string, unknown> = {}

    if (fields.namePhoneticSpelling && profile.namePhoneticSpelling) {
        payload[fields.namePhoneticSpelling] = profile.namePhoneticSpelling
    }
    if (fields.questionsPreference) {
        const value = withOther(profile.questionsPreference, profile.questionsPreferenceOther)
        if (value) payload[fields.questionsPreference] = value
    }
    if (fields.presentationDetails && profile.presentationDetails.length > 0) {
        const parts: string[] = profile.presentationDetails.filter((d) => d !== 'Other')
        if (profile.presentationDetails.includes('Other')) {
            parts.push(profile.presentationDetailsOther ? `Other: ${profile.presentationDetailsOther}` : 'Other')
        }
        payload[fields.presentationDetails] = parts.join(', ')
    }
    if (fields.optOutOfRecording) {
        payload[fields.optOutOfRecording] = profile.optOutOfRecording ? 'Yes' : 'No'
    }
    if (fields.introduction) {
        payload[fields.introduction] = profile.introductionUseSessionizeBio
            ? 'Use Sessionize bio'
            : (profile.introductionCustomText ?? '')
    }
    if (fields.anythingElse && profile.anythingElse) {
        payload[fields.anythingElse] = profile.anythingElse
    }
    if (fields.dietaryRequirements && profile.dietaryRequirements) {
        payload[fields.dietaryRequirements] = profile.dietaryRequirements
    }
    if (fields.rsvpSpeakersDinner && profile.rsvpSpeakersDinner) {
        payload[fields.rsvpSpeakersDinner] = profile.rsvpSpeakersDinner
    }
    if (fields.rsvpSpeakerTraining) {
        payload[fields.rsvpSpeakerTraining] =
            profile.rsvpSpeakerTraining.length > 0 ? profile.rsvpSpeakerTraining.join(', ') : 'None'
    }
    if (fields.registerMeetTheExperts) {
        const value = withOther(profile.registerMeetTheExperts, profile.registerMeetTheExpertsOther)
        if (value) payload[fields.registerMeetTheExperts] = value
    }

    return payload
}

export function createJiraSpeakerSyncService(args: { config: AppConfig; speakers: SpeakersStore }): SpeakerSyncService {
    const { config, speakers } = args
    const portalConfig = conferenceManifest.speakerPortal

    let client: JiraClient | null = null
    if (portalConfig) {
        if (config.jira.stub) {
            client = createStubJiraClient()
        } else if (config.jira.apiEmail && config.jira.apiToken) {
            client = createJiraClient({
                portalConfig,
                apiEmail: config.jira.apiEmail,
                apiToken: config.jira.apiToken,
                jqlOverride: config.jira.syncJqlOverride,
                apiBaseUrl: config.jira.apiBaseUrl,
            })
        }
    }

    // The stub always "writes back" (it just logs) so the flow can be walked
    // locally; the real client is gated behind JIRA_WRITEBACK_ENABLED so
    // staging can never edit real issues. Same pattern as sponsors.
    const writebackEnabled = config.jira.stub || config.jira.writebackEnabled

    return {
        isConfigured() {
            return client !== null
        },

        async syncNow(trigger) {
            if (!portalConfig || !client) {
                return { ok: false, reason: 'not-configured' }
            }

            const yearConfig = getYearConfig(portalConfig.year, config)
            if (yearConfig.kind !== 'conference' || yearConfig.sessions?.kind !== 'sessionize') {
                return { ok: false, reason: 'not-configured' }
            }
            const sessionizeEndpoint = yearConfig.sessions.sessionizeEndpoint
            if (!sessionizeEndpoint) {
                return { ok: false, reason: 'not-configured' }
            }

            const latest = await speakers.getLatestSyncRun()
            if (latest?.status === 'running' && latest.startedAt > Math.floor(Date.now() / 1000) - STALE_RUN_SECONDS) {
                return { ok: false, reason: 'already-running' }
            }

            const runId = await speakers.startSyncRun(trigger)
            try {
                const [allSessions, allSpeakers, jiraContacts, currentSpeakers, currentSpeakerSessions, currentContacts] =
                    await Promise.all([
                        getConfSessions({ sessionizeEndpoint }),
                        getConfSpeakers({ sessionizeEndpoint }),
                        client.searchSpeakerIssues(),
                        speakers.getAllSpeakersForSync(),
                        speakers.getAllSpeakerSessions(),
                        speakers.getAllContacts(),
                    ])

                const { format, level, generalTopic, talkTopics } = portalConfig.sessionizeCategoryNames
                const accessStatuses = new Set(portalConfig.portalAccessStatuses)
                const sessions: SyncSourceSession[] = allSessions
                    .filter((s) => s.status && accessStatuses.has(s.status))
                    .map((s) => ({
                        sessionizeSessionId: s.id,
                        sessionTitle: s.title,
                        description: s.description ?? undefined,
                        format: categoryValue(s, format),
                        level: categoryValue(s, level),
                        generalTopic: categoryValue(s, generalTopic),
                        talkTopics: categoryValues(s, talkTopics),
                        startsAt: s.startsAt ?? undefined,
                        endsAt: s.endsAt ?? undefined,
                        roomName: s.room ?? undefined,
                        status: s.status ?? 'Unknown',
                        speakerIds: s.speakers.map((sp) => sp.id),
                    }))

                const speakerInfo = allSpeakers.map((s) => ({
                    sessionizeId: s.id,
                    fullName: s.fullName,
                    tagLine: s.tagLine,
                    bio: s.bio ?? undefined,
                    profilePictureUrl: s.profilePicture ?? undefined,
                    links: s.links,
                }))

                const plan = computeSpeakerSyncPlan({
                    year: portalConfig.year,
                    sessions,
                    speakerInfo,
                    jiraContacts,
                    currentSpeakers,
                    currentSpeakerSessions,
                    currentContacts,
                })
                const counts = await speakers.applySyncPlan(plan)

                await speakers.finishSyncRun(runId, { status: 'ok', ...counts })
                console.log(
                    `Speaker sync (${trigger}): ${counts.speakersUpserted} upserted, ${counts.speakersDeactivated} deactivated, ` +
                        `${counts.contactsAdded} contacts added, ${counts.contactsRemoved} removed`,
                )

                const run = await speakers.getLatestSyncRun()
                return run ? { ok: true, run } : { ok: false, reason: 'error', error: 'Sync run vanished' }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                console.error(`Speaker sync (${trigger}) failed:`, message)
                await speakers.finishSyncRun(runId, { status: 'error', error: message }).catch(() => {})
                return { ok: false, reason: 'error', error: message }
            }
        },

        async pushProfileWriteback(sessionizeId) {
            if (!portalConfig || !client || !writebackEnabled) return

            try {
                const speaker = await speakers.getSpeaker(sessionizeId)
                if (!speaker?.jiraIssueKey) return

                const profile = await speakers.getProfile(sessionizeId)
                if (!profile) return

                const payload = buildProfileWritebackPayload(profile, portalConfig.jira.fields)
                if (Object.keys(payload).length > 0) {
                    await client.updateIssueFields(speaker.jiraIssueKey, payload)
                    console.log(`Speaker write-back: pushed profile fields to ${speaker.jiraIssueKey}`)
                }
            } catch (error) {
                console.error(
                    `Speaker write-back failed for ${sessionizeId}:`,
                    error instanceof Error ? error.message : error,
                )
            }
        },
    }
}

import type { DateTime } from 'luxon'
import { conferenceManifest } from '@conference/manifest'

/**
 * Declarative list of the speaker dashboard checklist items — one place to
 * add, reorder, relabel, or rewire the label/due-date/action for an item.
 * The completion logic stays in checklist.ts (it depends on real
 * profile/session data, so it can't be data-driven), but everything about
 * *how the item is presented* — including its due date — lives here, so
 * there's exactly one place to update it.
 *
 * Adding a new item: add an entry below, and add a matching predicate to
 * `CHECKLIST_DONE_PREDICATES` in checklist.ts.
 */

/** Which modal a "fill in/RSVP now" button opens — see the 4 modal
 * components rendered by SpeakerChecklistCard's callers (speaker-portal and
 * the admin preview). */
export type ChecklistModalKey = 'sessionDetails' | 'speakerTraining' | 'speakerDinner' | 'meetTheExperts'

export interface OpenModalAction {
    kind: 'openModal'
    modalKey: ChecklistModalKey
    buttonLabel: string
}

/**
 * A single link or "self-report" button rendered for a checklist item.
 * Set `href` for a static link; set `action` for a button that posts
 * `_action=<action>`. Note: can have a href or an action, not both — an item
 * wanting both (e.g. a Sessionize link plus a separate confirm button) lists
 * two of these in `actions` rather than combining them on one.
 */
export interface ExternalLinkAction {
    href?: string
    action?: 'confirm-session' | 'claim-ticket' | 'accept-backup'
    label: string
}

/**
 * A link whose URL is conference-specific and so comes from config rather
 * than from core — currently only the ticket claim URL
 * (`speakerPortal.checklist.ticketClaimUrl`). Rendered as a link when that
 * config value is set, and omitted entirely when it isn't: a fork with no
 * claim URL configured simply can't have its speakers claim a ticket, so
 * there's nothing useful to show.
 */
export interface ConfiguredLinkAction {
    configuredHref: 'ticketClaimUrl'
    label: string
}

export type ChecklistItemAction = OpenModalAction | ExternalLinkAction | ConfiguredLinkAction

export type ChecklistItemKey =
    | 'confirmSession'
    | 'sessionDetails'
    | 'claimTicket'
    | 'speakerTraining'
    | 'speakerDinner'
    | 'meetTheExperts'
    | 'acceptBackupSpeaker'

export interface ChecklistItemDefinition {
    key: ChecklistItemKey
    label: string
    actions: ChecklistItemAction[]
}

/**
 * A checklist item's due date, from the fork's
 * `speakerPortal.checklist.dueDates` config. Due dates are a per-conference,
 * per-year calendar, so core holds the item definitions (label, actions,
 * ordering) and the fork owns the dates. Returns undefined for an item with
 * no configured date, which renders it undated.
 */
export function checklistDueDate(key: ChecklistItemKey): DateTime | undefined {
    return conferenceManifest.speakerPortal?.checklist?.dueDates?.[key]
}

export const SPEAKER_CHECKLIST_ITEMS: ChecklistItemDefinition[] = [
    {
        key: 'confirmSession',
        label: 'Confirm your session in Sessionize',
        actions: [
            { href: 'https://sessionize.com/app/speaker', label: 'Open Sessionize ↗' },
            { action: 'confirm-session', label: "I've already confirmed it" },
        ],
    },
    {
        // Only shown instead of confirmSession, for a speaker with no
        // Accepted session — see `isBackupSpeaker` in checklist.ts.
        key: 'acceptBackupSpeaker',
        label: 'Accept being a backup speaker',
        actions: [{ action: 'accept-backup', label: 'I accept being a backup speaker' }],
    },
    {
        key: 'sessionDetails',
        label: 'Fill in your session details',
        actions: [{ kind: 'openModal', modalKey: 'sessionDetails', buttonLabel: 'Fill in now' }],
    },
    {
        key: 'claimTicket',
        label: 'Claim your speaker ticket',
        actions: [
            { configuredHref: 'ticketClaimUrl', label: 'Claim your ticket ↗' },
            { action: 'claim-ticket', label: "I've claimed it" },
        ],
    },
    {
        key: 'speakerTraining',
        label: 'RSVP for speaker training',
        actions: [{ kind: 'openModal', modalKey: 'speakerTraining', buttonLabel: 'RSVP now' }],
    },
    {
        key: 'speakerDinner',
        label: 'RSVP for the speaker dinner',
        actions: [{ kind: 'openModal', modalKey: 'speakerDinner', buttonLabel: 'RSVP now' }],
    },
    {
        // Only shown once registerMeetTheExperts is Yes/Maybe/Other — see
        // `isMeetTheExpertsApplicable` in checklist.ts, which filters this
        // item out of the list entirely otherwise.
        key: 'meetTheExperts',
        label: 'Register for Meet the Experts',
        actions: [{ kind: 'openModal', modalKey: 'meetTheExperts', buttonLabel: 'Register' }],
    },
]

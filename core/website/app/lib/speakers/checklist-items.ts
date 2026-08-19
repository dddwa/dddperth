import { DateTime } from 'luxon'

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
 * Set `href` for a link (omit to fall back to the dynamic `ticketClaimUrl`
 * prop passed into the card at render time — only meaningful when `action`
 * is also unset); set `action` for a button that posts `_action=<action>`.
 * Note: can have a href or an action, not both — an item wanting both (e.g.
 * a Sessionize link plus a separate confirm button) lists two of these in
 * `actions` rather than combining them on one.
 */
export interface ExternalLinkAction {
    href?: string
    action?: 'confirm-session' | 'claim-ticket'
    label: string
}

export type ChecklistItemAction = OpenModalAction | ExternalLinkAction

export interface ChecklistItemDefinition {
    key: 'confirmSession' | 'sessionDetails' | 'claimTicket' | 'speakerTraining' | 'speakerDinner' | 'meetTheExperts'
    label: string
    /** Omit for no due date. */
    dueDate?: DateTime
    actions: ChecklistItemAction[]
}

export const SPEAKER_CHECKLIST_ITEMS: ChecklistItemDefinition[] = [
    {
        key: 'confirmSession',
        label: 'Confirm your session in Sessionize',
        dueDate: DateTime.fromISO('2026-08-21T17:00:00', { zone: 'Australia/Perth' }),
        actions: [
            { href: 'https://sessionize.com/app/speaker', label: 'Open Sessionize ↗' },
            { action: 'confirm-session', label: "I've already confirmed it" },
        ],
    },
    {
        key: 'sessionDetails',
        label: 'Fill in your session details',
        dueDate: DateTime.fromISO('2026-09-25T22:00:00', { zone: 'Australia/Perth' }),
        actions: [{ kind: 'openModal', modalKey: 'sessionDetails', buttonLabel: 'Fill in now' }],
    },
    {
        key: 'claimTicket',
        label: 'Claim your speaker ticket',
        dueDate: DateTime.fromISO('2026-09-11T22:00:00', { zone: 'Australia/Perth' }),
        actions: [
            // href omitted — falls back to the dynamic ticketClaimUrl prop.
            { label: 'Claim your ticket ↗' },
            { action: 'claim-ticket', label: "I've claimed it" },
        ],
    },
    {
        key: 'speakerTraining',
        label: 'RSVP for speaker training',
        dueDate: DateTime.fromISO('2026-08-28T22:00:00', { zone: 'Australia/Perth' }),
        actions: [{ kind: 'openModal', modalKey: 'speakerTraining', buttonLabel: 'RSVP now' }],
    },
    {
        key: 'speakerDinner',
        label: 'RSVP for the speaker dinner',
        dueDate: DateTime.fromISO('2026-09-25T17:00:00', { zone: 'Australia/Perth' }),
        actions: [{ kind: 'openModal', modalKey: 'speakerDinner', buttonLabel: 'RSVP now' }],
    },
    {
        // Only shown once registerMeetTheExperts is Yes/Maybe/Other — see
        // `isMeetTheExpertsApplicable` in checklist.ts, which filters this
        // item out of the list entirely otherwise.
        key: 'meetTheExperts',
        label: 'Register for Meet the Experts',
        dueDate: DateTime.fromISO('2026-09-18T22:00:00', { zone: 'Australia/Perth' }),
        actions: [{ kind: 'openModal', modalKey: 'meetTheExperts', buttonLabel: 'Register' }],
    },
]

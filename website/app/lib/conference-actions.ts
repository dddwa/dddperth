import { ConferenceState } from './config-types'

export interface CallToAction {
    title: string
    url: string
    category: 'conference' | 'tickets' | 'agenda' | 'content' | 'voting'
}

export function getConferenceActions(conferenceState: ConferenceState): CallToAction[] {
    const actions: CallToAction[] = []

    if (conferenceState.callForPapers.state === 'open') {
        actions.push({
            category: 'content',
            title: 'Submit presentation',
            url: '/cfp',
        })
    }

    if (conferenceState.talkVoting === 'open') {
        actions.push({
            category: 'voting',
            title: 'Vote for agenda',
            url: '/vote',
        })
    }

    if (conferenceState.ticketSales.state === 'open') {
        actions.push({
            category: 'tickets',
            title: 'Purchase a ticket',
            url: '/tickets',
        })
    }

    if (conferenceState.feedback === 'open') {
        actions.push({
            category: 'conference',
            title: 'Give feedback',
            url: '/feedback',
        })
    }

    if (conferenceState.conferenceState === 'before-conference' && conferenceState.agenda === 'published') {
        actions.push({
            category: 'agenda',
            title: 'View the agenda',
            url: '/agenda',
        })
    }

    if (
        conferenceState.conferenceState === 'week-before-conference' ||
        conferenceState.conferenceState === 'conference-day'
    ) {
        actions.push({
            category: 'conference',
            title: 'Conference Day Info',
            url: '/conference-day',
        })
    }

    if (conferenceState.conferenceState !== 'before-conference' && conferenceState.agenda === 'published') {
        actions.push({
            category: 'agenda',
            title: 'View the agenda',
            url: '/agenda',
        })
    }

    return actions
}

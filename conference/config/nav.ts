import type { NavConfig } from '@ddd/conference-config'

/**
 * DDD Perth header nav. Order matters — these render left-to-right on desktop
 * and top-to-bottom in the mobile drawer.
 *
 * Conditional CTAs (Buy Tickets, Vote!, Propose a Talk) and the Venue link
 * are composed by core from runtime state, not listed here. With
 * `features.venueReplacesAboutNearConference`, Venue takes About's place in
 * the week before the conference.
 *
 * Sponsorship isn't here: the sponsors page and the footer both link to it.
 */
export const nav: NavConfig = [
    { to: '/agenda', label: 'Agenda' },
    { to: '/blog', label: 'Blog' },
    { to: '/sponsors', label: 'Sponsors' },
    { to: '/about', label: 'About' },
]

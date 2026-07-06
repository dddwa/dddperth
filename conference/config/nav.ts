import type { NavConfig } from '@ddd/conference-config'

/**
 * DDD Perth header nav. Order matters — these render left-to-right on desktop
 * and top-to-bottom in the mobile drawer.
 *
 * Conditional CTAs (Buy Tickets, Vote!, Propose a Talk) and the Venue link
 * (hidden when no venue is published yet) are composed by core from runtime
 * state, not listed here.
 */
export const nav: NavConfig = [
    { to: '/sponsorship', label: 'Sponsorship' },
    { to: '/sponsors', label: 'Sponsors' },
    { to: '/agenda', label: 'Agenda' },
    { to: '/about', label: 'About' },
]

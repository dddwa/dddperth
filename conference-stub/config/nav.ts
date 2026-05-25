import type { NavConfig } from '@ddd/conference-config'

/**
 * Reference nav for the DevConf Example stub. Forks usually replace this with
 * their own list — Venue/CFP/Tickets/Vote are appended by core from runtime
 * state and shouldn't be listed here.
 */
export const nav: NavConfig = [
    { to: '/sponsorship', label: 'Sponsorship' },
    { to: '/sponsors', label: 'Sponsors' },
    { to: '/agenda', label: 'Agenda' },
    { to: '/about', label: 'About' },
]

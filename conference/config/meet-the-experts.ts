import type { MeetTheExpertsConfig } from '@ddd/conference-config'

/**
 * Meet-the-Experts time blocks for DDD Perth — shared by the speaker portal
 * (once a speaker opts in via the session-details form) and the sponsor
 * portal (sponsors register straight in, no opt-in step).
 *
 * TODO: confirm exact Meet-the-Experts slot boundaries — placeholder six
 * ~55-min blocks spanning the stated 10:30am-4pm window.
 */
export const meetTheExperts: MeetTheExpertsConfig = {
    slots: [
        { id: 'slot-1', label: '10:30am – 11:25am' },
        { id: 'slot-2', label: '11:25am – 12:20pm' },
        { id: 'slot-3', label: '12:20pm – 1:15pm' },
        { id: 'slot-4', label: '1:15pm – 2:10pm' },
        { id: 'slot-5', label: '2:10pm – 3:05pm' },
        { id: 'slot-6', label: '3:05pm – 4:00pm' },
    ],
}

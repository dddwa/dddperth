import type { ChecklistItemDefinition } from './checklist-items'

/**
 * Follow-up email copy for the admin speakers list's per-checklist-item
 * "nudge" buttons — one entry per item key, in one place so it's easy to
 * tweak wording without touching the route that sends them
 * (routes/admin.speakers._index.tsx). Every key in `SPEAKER_CHECKLIST_ITEMS`
 * (checklist-items.ts) must have an entry here. Written second-person —
 * these go straight to the speaker's own contact address, not a proxy.
 */

export interface FollowUpEmailVars {
    firstName: string
    /** Absolute URL to the speaker portal login. */
    portalUrl: string
    conferenceName: string
}

export interface FollowUpEmailTemplate {
    subject: string
    text: (vars: FollowUpEmailVars) => string
    html: (vars: FollowUpEmailVars) => string
}

export const FOLLOW_UP_EMAIL_TEMPLATES: Record<ChecklistItemDefinition['key'], FollowUpEmailTemplate> = {
    confirmSession: {
        subject: 'Please confirm your session in Sessionize',
        text: ({ firstName, portalUrl, conferenceName }) => `Hi ${firstName},

Just a friendly reminder that you still need to confirm your session in Sessionize for ${conferenceName}.

Log in to the speaker portal to sort it out: ${portalUrl}

Thanks,
${conferenceName} team`,
        html: ({ firstName, portalUrl, conferenceName }) => `<p>Hi ${firstName},</p>
<p>Just a friendly reminder that you still need to confirm your session in Sessionize for ${conferenceName}.</p>
<p>Please <a href="${portalUrl}">log in to the speaker portal</a> to sort it out.</p>
<p>Thanks,<br/>${conferenceName} team</p>`,
    },

    sessionDetails: {
        subject: 'A few session details are still missing',
        text: ({ firstName, portalUrl, conferenceName }) => `Hi ${firstName},

We're still missing a few of your session details for ${conferenceName} — things like how you'd like to be introduced and whether you'll take audience questions.

Log in to the speaker portal to fill them in: ${portalUrl}

Thanks,
${conferenceName} team`,
        html: ({ firstName, portalUrl, conferenceName }) => `<p>Hi ${firstName},</p>
<p>We're still missing a few of your session details for ${conferenceName} — things like how you'd like to be introduced and whether you'll take audience questions.</p>
<p>Please <a href="${portalUrl}">log in to the speaker portal</a> to fill them in.</p>
<p>Thanks,<br/>${conferenceName} team</p>`,
    },

    claimTicket: {
        subject: "Don't forget to claim your speaker ticket",
        text: ({ firstName, portalUrl, conferenceName }) => `Hi ${firstName},

Just a friendly reminder that you haven't claimed your complimentary speaker ticket for ${conferenceName} yet.

Log in to the speaker portal for the link: ${portalUrl}

Thanks,
${conferenceName} team`,
        html: ({ firstName, portalUrl, conferenceName }) => `<p>Hi ${firstName},</p>
<p>Just a friendly reminder that you haven't claimed your complimentary speaker ticket for ${conferenceName} yet.</p>
<p>Please <a href="${portalUrl}">log in to the speaker portal</a> for the link.</p>
<p>Thanks,<br/>${conferenceName} team</p>`,
    },

    speakerTraining: {
        subject: 'RSVP for speaker training',
        text: ({ firstName, portalUrl, conferenceName }) => `Hi ${firstName},

We haven't heard back from you about speaker training for ${conferenceName} yet — even if you can't make any of the sessions, letting us know helps with planning.

Log in to the speaker portal to RSVP: ${portalUrl}

Thanks,
${conferenceName} team`,
        html: ({ firstName, portalUrl, conferenceName }) => `<p>Hi ${firstName},</p>
<p>We haven't heard back from you about speaker training for ${conferenceName} yet — even if you can't make any of the sessions, letting us know helps with planning.</p>
<p>Please <a href="${portalUrl}">log in to the speaker portal</a> to RSVP.</p>
<p>Thanks,<br/>${conferenceName} team</p>`,
    },

    speakerDinner: {
        subject: 'RSVP for the speaker dinner',
        text: ({ firstName, portalUrl, conferenceName }) => `Hi ${firstName},

We haven't heard back from you about the speaker dinner for ${conferenceName} yet — even if you can't make it, letting us know helps with catering numbers.

Log in to the speaker portal to RSVP: ${portalUrl}

Thanks,
${conferenceName} team`,
        html: ({ firstName, portalUrl, conferenceName }) => `<p>Hi ${firstName},</p>
<p>We haven't heard back from you about the speaker dinner for ${conferenceName} yet — even if you can't make it, letting us know helps with catering numbers.</p>
<p>Please <a href="${portalUrl}">log in to the speaker portal</a> to RSVP.</p>
<p>Thanks,<br/>${conferenceName} team</p>`,
    },

    meetTheExperts: {
        subject: 'Choose your Meet the Experts time slots',
        text: ({ firstName, portalUrl, conferenceName }) => `Hi ${firstName},

You opted in to Meet the Experts for ${conferenceName} but haven't picked your time slots yet.

Log in to the speaker portal to choose your times: ${portalUrl}

Thanks,
${conferenceName} team`,
        html: ({ firstName, portalUrl, conferenceName }) => `<p>Hi ${firstName},</p>
<p>You opted in to Meet the Experts for ${conferenceName} but haven't picked your time slots yet.</p>
<p>Please <a href="${portalUrl}">log in to the speaker portal</a> to choose your times.</p>
<p>Thanks,<br/>${conferenceName} team</p>`,
    },

    acceptBackupSpeaker: {
        subject: 'Please confirm you accept being a backup speaker',
        text: ({ firstName, portalUrl, conferenceName }) => `Hi ${firstName},

Just a friendly reminder that we still need you to confirm you accept being a backup speaker for ${conferenceName}.

Log in to the speaker portal to sort it out: ${portalUrl}

Thanks,
${conferenceName} team`,
        html: ({ firstName, portalUrl, conferenceName }) => `<p>Hi ${firstName},</p>
<p>Just a friendly reminder that we still need you to confirm you accept being a backup speaker for ${conferenceName}.</p>
<p>Please <a href="${portalUrl}">log in to the speaker portal</a> to sort it out.</p>
<p>Thanks,<br/>${conferenceName} team</p>`,
    },
}

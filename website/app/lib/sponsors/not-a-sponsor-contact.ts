/**
 * Error payload for a signed-in email that isn't linked to an active sponsor.
 * Carries the email because the usual cause is signing in with a different
 * address from the one on the sponsor's contact list, and the portal's error
 * page can only say so if it knows which address was used.
 */
export interface NotASponsorContact {
    reason: 'not-a-sponsor-contact'
    email: string
}

export function isNotASponsorContact(value: unknown): value is NotASponsorContact {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as { reason?: unknown }).reason === 'not-a-sponsor-contact' &&
        typeof (value as { email?: unknown }).email === 'string'
    )
}

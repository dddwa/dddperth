/**
 * Error payload for a signed-in email that has no admin access and no other
 * area to be sent to. Carries the email so the admin error page can say which
 * address was used — the usual fix is signing in with a different one, or
 * getting this one added to the allowlist.
 */
export interface NotAnAdmin {
    reason: 'not-an-admin'
    email: string
}

export function isNotAnAdmin(value: unknown): value is NotAnAdmin {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as { reason?: unknown }).reason === 'not-an-admin' &&
        typeof (value as { email?: unknown }).email === 'string'
    )
}

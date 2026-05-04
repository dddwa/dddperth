import type { Authenticator } from 'remix-auth'
import type { User } from '../session-types'

/**
 * Authentication surface. The Authenticator is from remix-auth — we expose
 * it directly because route code needs to call `.authenticate()` on it.
 *
 * Forks that don't use GitHub OAuth can swap the authenticator instance for
 * one configured with their own strategy.
 */
export interface AuthService {
    isConfigured(): boolean
    /** Throws if `isConfigured()` is false. */
    getAuthenticator(): Authenticator<User>
}

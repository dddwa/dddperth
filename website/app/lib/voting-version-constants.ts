/**
 * Version constants for the voting system
 *
 * When upgrading versions, update these constants to cause cascading
 * type errors that will guide you to all the places that need updates.
 */

// Current session version - increment when session structure changes
export const CURRENT_SESSION_VERSION = 4

// Current vote record version - increment when vote structure changes
export const CURRENT_VOTE_VERSION = 2

// Client version string - update when API contracts change
export const CURRENT_CLIENT_VERSION = 'v4'

// Type helpers for current versions
export type CurrentSessionVersion = typeof CURRENT_SESSION_VERSION
export type CurrentVoteVersion = typeof CURRENT_VOTE_VERSION
export type CurrentClientVersionString = typeof CURRENT_CLIENT_VERSION

import { createContext, type RouterContext } from 'react-router'
import type { ConferenceState } from './lib/conference-state-client-safe'
import type { DateTimeProvider } from './lib/dates/date-time-provider.server'
import type { AppConfig } from './lib/services/app-config'
import type { AppServices } from './lib/services/app-services'

/**
 * Cloudflare-specific environment bindings. Only consumed by the Cloudflare
 * service builders and the worker entry — application code should read from
 * `getConfig(context)` and `getServices(context)` instead.
 */
export interface CloudflareEnv {
    DB: D1Database

    SESSION_SECRET: string
    WEB_URL: string

    /** "true" turns on the staging-wide auth gate. Anything else leaves only `/admin` gated. */
    WEBSITE_AUTH_REQUIRED?: string
    /** Resend API key. Optional locally — if absent, magic links are logged to the console. */
    RESEND_API_KEY?: string
    /** From-address for outgoing magic-link emails. */
    AUTH_EMAIL_FROM?: string

    TITO_SECURITY_TOKEN?: string

    SESSIONIZE_2026_SESSIONS: string
    SESSIONIZE_2026_ALL_SESSIONS?: string
}

/**
 * React Router v8 replaced the object-style `AppLoadContext` with a
 * `RouterContextProvider`: `getLoadContext` populates these context keys and
 * loaders/actions read them back via `context.get(...)`. Use the accessor
 * helpers below rather than calling `context.get` directly so routes stay
 * terse and type-safe.
 */
export const configContext = createContext<AppConfig>()
export const servicesContext = createContext<AppServices>()
export const conferenceStateContext = createContext<ConferenceState>()
export const dateTimeProviderContext = createContext<DateTimeProvider>()

interface ContextReader {
    get<T>(context: RouterContext<T>): T
}

export const getConfig = (context: ContextReader): AppConfig => context.get(configContext)
export const getServices = (context: ContextReader): AppServices => context.get(servicesContext)
export const getConferenceState = (context: ContextReader): ConferenceState => context.get(conferenceStateContext)
export const getDateTimeProvider = (context: ContextReader): DateTimeProvider => context.get(dateTimeProviderContext)

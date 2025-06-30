import { z } from 'zod'

// Admin handles, should be lowercase
export const ADMIN_HANDLES = [
    'jakeginnivan',
    'vickiturns',
    'amykapernick',
    // Add more admin GitHub handles here
    // Example: 'john-doe', 'jane-smith'
] as const

export const {
    WEB_URL,
    SESSION_SECRET,
    APPLICATIONINSIGHTS_CONNECTION_STRING,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
    OTEL_EXPORTER_OTLP_ENDPOINT,
    USE_GITHUB_CONTENT,
    GITHUB_ORGANIZATION,
    GITHUB_REF,
    GITHUB_REPO,
    WEBSITE_GITHUB_APP_ID,
    WEBSITE_GITHUB_APP_CLIENT_ID,
    WEBSITE_GITHUB_APP_CLIENT_SECRET,
    WEBSITE_GITHUB_APP_PRIVATE_KEY,
    WEBSITE_GITHUB_APP_INSTALLATION_ID,
    TITO_SECURITY_TOKEN,
    EVENTS_AIR_CLIENT_ID,
    EVENTS_AIR_CLIENT_SECRET,
    EVENTS_AIR_TENANT_ID,
    EVENTS_AIR_EVENT_ID,
    AZURE_STORAGE_ACCOUNT_NAME,
    SESSIONIZE_2025_ALL_SESSIONS,
} = z
    .object({
        NODE_ENV: z.string(),
        SESSION_SECRET: z.string(),
        WEB_URL: z.string(),

        APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
        OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().optional(),
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: z.string().optional(),
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: z.string().optional(),

        USE_GITHUB_CONTENT: z
            .string()
            .transform((val) => val === 'true')
            .default('true'),

        GITHUB_REF: z.string().default('main'),
        GITHUB_ORGANIZATION: z.string(),
        GITHUB_REPO: z.string(),
        WEBSITE_GITHUB_APP_ID: z.string().min(1, 'WEBSITE_GITHUB_APP_ID is required for GitHub App authentication'),
        WEBSITE_GITHUB_APP_CLIENT_ID: z
            .string()
            .min(1, 'WEBSITE_GITHUB_APP_CLIENT_ID is required for GitHub App authentication'),
        WEBSITE_GITHUB_APP_CLIENT_SECRET: z
            .string()
            .min(1, 'WEBSITE_GITHUB_APP_CLIENT_SECRET is required for GitHub App authentication'),
        WEBSITE_GITHUB_APP_PRIVATE_KEY: z
            .string()
            .min(1, 'WEBSITE_GITHUB_APP_PRIVATE_KEY is required for GitHub App authentication'),
        WEBSITE_GITHUB_APP_INSTALLATION_ID: z
            .string()
            .min(1, 'WEBSITE_GITHUB_APP_INSTALLATION_ID is required for GitHub App authentication'),
        TITO_SECURITY_TOKEN: z.string().optional(),
        EVENTS_AIR_CLIENT_ID: z.string().optional(),
        EVENTS_AIR_CLIENT_SECRET: z.string().optional(),
        EVENTS_AIR_TENANT_ID: z.string().optional(),
        EVENTS_AIR_EVENT_ID: z.string().optional(),

        SESSIONIZE_2025_ALL_SESSIONS: z.string().optional(),
        AZURE_STORAGE_ACCOUNT_NAME: z.string(),
    })
    .parse(process.env)

export type AdminHandle = (typeof ADMIN_HANDLES)[number]

export function isAdminHandle(handle: string): handle is AdminHandle {
    return ADMIN_HANDLES.includes(handle.toLowerCase() as AdminHandle)
}

// Helper function to decode base64 encoded private key
export function getGitHubPrivateKey(): string {
    try {
        // Decode base64 private key
        return Buffer.from(WEBSITE_GITHUB_APP_PRIVATE_KEY, 'base64').toString('utf8')
    } catch (error) {
        console.error('Failed to decode GitHub private key:', error)
        throw new Error(
            'Failed to decode GitHub private key. Ensure WEBSITE_GITHUB_APP_PRIVATE_KEY is a valid base64 encoded string.',
        )
    }
}

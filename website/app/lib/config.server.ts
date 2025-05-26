import { z } from 'zod'

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
  GITHUB_TOKEN,
  GITHUB_APP_ID,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_PRIVATE_KEY,
  TITO_SECURITY_TOKEN,
  EVENTS_AIR_CLIENT_ID,
  EVENTS_AIR_CLIENT_SECRET,
  EVENTS_AIR_TENANT_ID,
  EVENTS_AIR_EVENT_ID,
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
    GITHUB_TOKEN: z.string().optional(),
    GITHUB_ORGANIZATION: z.string(),
    GITHUB_REPO: z.string(),
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_PRIVATE_KEY: z.string().optional(),
    TITO_SECURITY_TOKEN: z.string().optional(),
    EVENTS_AIR_CLIENT_ID: z.string().optional(),
    EVENTS_AIR_CLIENT_SECRET: z.string().optional(),
    EVENTS_AIR_TENANT_ID: z.string().optional(),
    EVENTS_AIR_EVENT_ID: z.string().optional(),
  })
  .parse(process.env)

// Admin configuration
export const ADMIN_HANDLES = [
  'jakeginnivan',
  // Add more admin GitHub handles here
  // Example: 'john-doe', 'jane-smith'
] as const

export type AdminHandle = (typeof ADMIN_HANDLES)[number]

export function isAdminHandle(handle: string): handle is AdminHandle {
  return ADMIN_HANDLES.includes(handle.toLowerCase() as AdminHandle)
}

// Helper function to decode base64 encoded private key
export function getGitHubPrivateKey(): string | undefined {
  if (!GITHUB_PRIVATE_KEY) return undefined
  
  try {
    // Decode base64 private key
    return Buffer.from(GITHUB_PRIVATE_KEY, 'base64').toString('utf8')
  } catch (error) {
    console.error('Failed to decode GitHub private key:', error)
    return undefined
  }
}

// Usage example for GitHub App operations:
// import { getGitHubPrivateKey } from '~/lib/config.server'
// 
// const privateKey = getGitHubPrivateKey()
// if (privateKey) {
//   // Use with @octokit/app or similar for GitHub App API calls
//   const app = new App({
//     appId: GITHUB_APP_ID,
//     privateKey,
//   })
// }

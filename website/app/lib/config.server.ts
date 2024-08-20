import { z } from 'zod'

export const {
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
} = z
    .object({
        NODE_ENV: z.string(),
        SESSION_SECRET: z.string(),

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
    })
    .parse(process.env)

import type { Span } from '@opentelemetry/api'
import { SpanStatusCode, trace, type Attributes } from '@opentelemetry/api'
import { serializeError } from 'serialize-error'
import { resolveError } from './resolve-error'

/**
 * Should be used instead of span.recordException for better telemetry
 *
 * Expects if using application insights, the connection string is in the APPLICATIONINSIGHTS_CONNECTION_STRING env var
 *
 * @param err the error to record
 * @param record
 * @param record.isFailure - if true, the span will be marked with a ERROR status, defaults to true
 * @param record.attributes - additional attributes to be added to the span
 * */
export function recordException(err: unknown, opts?: { attributes?: Attributes; isFailure?: boolean; span?: Span }) {
    const activeSpan = opts?.span ?? trace.getActiveSpan()
    const span = activeSpan ?? trace.getTracer('default').startSpan('fallback-span')

    const { name, stack, message, ...errorAttributes } = serializeError(resolveError(err))
    const basicAttributes = Object.entries(errorAttributes).reduce(
        (acc, [key, value]) => {
            if (typeof value === 'string') {
                acc[key] = value
            } else {
                acc[key] = JSON.stringify(value)
            }
            return acc
        },
        {} as Record<string, string>,
    )

    // additionalAttributes: JSON.stringify(errorAttributes),
    const attributes: Attributes = {
        ...(opts?.attributes || {}),
        ['exception.type']: name === 'Error' ? message : name,
        ['exception.stacktrace']: stack,
        ['exception.message']: message,
        ...basicAttributes,
    }

    const isFailure = opts?.isFailure !== false
    // We can't use `exception` here, because it will not show in App Insights
    const eventName = process.env['APPLICATIONINSIGHTS_CONNECTION_STRING'] ? 'app.error' : 'exception'
    if (isFailure) {
        span.addEvent(eventName, attributes)
        span.setStatus({ code: SpanStatusCode.ERROR })
    } else {
        span.addEvent(eventName, attributes)
    }

    if (!activeSpan) {
        span.end()
    }
}

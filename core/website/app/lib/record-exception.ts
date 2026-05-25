import { serializeError } from 'serialize-error'
import { resolveError } from './resolve-error'

/**
 * Records an exception for logging/monitoring purposes.
 * In Cloudflare Workers, this logs to console which is captured by Cloudflare's observability.
 */
export function recordException(
    err: unknown,
    opts?: { attributes?: Record<string, unknown>; isFailure?: boolean },
): void {
    const error = resolveError(err)
    const serialized = serializeError(error)

    if (opts?.isFailure !== false) {
        console.error('Exception recorded:', {
            name: serialized.name,
            message: serialized.message,
            stack: serialized.stack,
            ...opts?.attributes,
        })
    } else {
        console.warn('Exception recorded (non-failure):', {
            name: serialized.name,
            message: serialized.message,
            ...opts?.attributes,
        })
    }
}

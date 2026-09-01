import type { z } from 'zod'

export type ParsedForm<T> = { ok: true; data: T } | { ok: false; fieldErrors: Record<string, string> }

/**
 * Validates FormData against a zod schema of string fields. Returns either
 * the parsed value or a field → first-error-message map suitable for
 * rendering next to inputs. Multi-value fields aren't supported — the
 * portal's forms are flat string inputs.
 */
export function parseFormData<TSchema extends z.ZodType>(
    schema: TSchema,
    formData: FormData,
): ParsedForm<z.infer<TSchema>> {
    const values: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') values[key] = value
    }

    const result = schema.safeParse(values)
    if (result.success) return { ok: true, data: result.data }

    const fieldErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
        const field = issue.path.join('.') || '_form'
        if (!(field in fieldErrors)) fieldErrors[field] = issue.message
    }
    return { ok: false, fieldErrors }
}

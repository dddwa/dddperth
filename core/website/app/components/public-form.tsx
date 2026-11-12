import { useEffect, useRef } from 'react'
import { HONEYPOT_FIELD, STARTED_AT_FIELD } from '~/lib/feedback/feedback-submission'
import { Box, styled } from '~/styled-system/jsx'

/**
 * Pieces shared by the public, unauthenticated forms (competitions, surveys):
 * the spam-check fields, the error summary and the input styling. The spam
 * checks themselves are `looksLikeSpam()` in `~/lib/feedback/feedback-submission`.
 */

/**
 * The two hidden inputs `looksLikeSpam()` reads: the render time (for the
 * minimum-fill-time check) and the honeypot, which is hidden from sight,
 * screen readers and the tab order, so only a bot fills it.
 */
export function SpamCheckFields({ startedAt }: { startedAt: number }) {
    return (
        <>
            <input type="hidden" name={STARTED_AT_FIELD} value={startedAt} />
            <Box aria-hidden="true" srOnly>
                <label>
                    Leave this field empty
                    <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
                </label>
            </Box>
        </>
    )
}

/** Takes focus when errors appear, which both announces it and keeps the person near the fields to fix. */
export function ErrorSummary({ fieldErrors }: { fieldErrors: Record<string, string> }) {
    const ref = useRef<HTMLDivElement>(null)
    const hasErrors = Object.keys(fieldErrors).length > 0

    useEffect(() => {
        if (hasErrors) ref.current?.focus()
    }, [fieldErrors, hasErrors])

    if (!hasErrors) return null
    return (
        <Box ref={ref} role="alert" tabIndex={-1} mb="6" p="4" bg="status.danger.bg" color="status.danger.fg" rounded="md">
            {fieldErrors._form ?? 'Please check the highlighted fields and try again.'}
        </Box>
    )
}

export function FieldError({ id, error }: { id: string; error?: string }) {
    if (!error) return null
    return (
        <styled.p
            id={id}
            mt="1"
            fontSize="sm"
            color="status.danger.fg"
            bg="status.danger.bg"
            px="2"
            py="1"
            rounded="sm"
        >
            {error}
        </styled.p>
    )
}

/** Joins the ids for `aria-describedby`, dropping absent ones; undefined when none remain. */
export function describedBy(...ids: Array<string | false | undefined>): string | undefined {
    return ids.filter(Boolean).join(' ') || undefined
}

/** Solid rather than the `focus-ring` shadow, which is ~20% opacity and too faint to see on these surfaces. */
export const focusOutline = {
    outlineStyle: 'solid',
    outlineWidth: 'medium',
    outlineColor: 'interactive.focus',
    outlineOffset: '0.5',
} as const

export const inputStyles = {
    display: 'block',
    w: 'full',
    px: '3',
    py: '2',
    rounded: 'md',
    bg: 'surface.elevated',
    color: 'text.primary',
    border: 'default',
    fontSize: 'md',
    _focusVisible: focusOutline,
} as const

/** Native radio/checkbox sizing, so they're a comfortable tap target. */
export const choiceInputStyles = {
    width: '5',
    height: '5',
    mt: '0.5',
    flexShrink: '0',
    accentColor: 'brand.primary',
    _focusVisible: focusOutline,
} as const

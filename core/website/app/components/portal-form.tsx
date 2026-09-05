import type { ReactNode } from 'react'
import { css } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'

/**
 * Shared form chrome for the sponsor portal pages.
 *
 * Portal chrome sits on white admin cards regardless of the site theme, so
 * these use the theme-invariant admin.* treatment (same as the auth pages)
 * rather than the theme-dependent Park UI recipes — which render
 * white-on-white here in the dark theme.
 *
 * Styles live in css() calls (not spread objects) so Panda's static
 * extraction sees them — a spread of a plain object generates no CSS.
 */

export const inputClass = css({
    mt: '1',
    w: 'full',
    px: '3',
    py: '2',
    // admin-subtle (admin.200) is for card edges and vanishes on white at
    // input scale — form fields use the login page's admin.400 treatment.
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'admin.400',
    borderRadius: 'md',
    fontSize: 'sm',
    bg: 'white',
    color: 'admin.900',
    _placeholder: { color: 'admin.400' },
    _focus: { outline: 'none', borderColor: 'indigo.7', boxShadow: 'focus-ring' },
})

export const textareaClass = css({
    mt: '1',
    w: 'full',
    px: '3',
    py: '2',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'admin.400',
    borderRadius: 'md',
    fontSize: 'sm',
    // Textareas default to the UA's own font rather than inheriting; Panda's
    // fontFamily only accepts theme tokens, so reach for the raw property.
    '--font-fallback': 'inherit',
    fontFamily: 'var(--font-fallback)',
    bg: 'white',
    color: 'admin.900',
    minH: '20',
    resize: 'vertical',
    _placeholder: { color: 'admin.400' },
    _focus: { outline: 'none', borderColor: 'indigo.7', boxShadow: 'focus-ring' },
})

export const fieldLabelClass = css({
    display: 'block',
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'admin.700',
})

export const dropzoneClass = css({
    display: 'block',
    borderWidth: '1px',
    borderStyle: 'dashed',
    borderColor: 'admin.400',
    borderRadius: 'lg',
    bg: 'admin.50',
    py: '8',
    px: '4',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'colors',
    _hover: { borderColor: 'indigo.7', bg: 'admin.100' },
})

export function PrimaryButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
    return (
        <styled.button
            type="submit"
            disabled={disabled}
            bg="admin.900"
            color="white"
            border="none"
            py="2.5"
            px="6"
            borderRadius="md"
            fontSize="sm"
            fontWeight="semibold"
            cursor="pointer"
            transition="colors"
            _hover={{ bg: 'admin.800' }}
            _disabled={{ bg: 'admin.400', cursor: 'not-allowed', opacity: 0.8 }}
        >
            {children}
        </styled.button>
    )
}

export function FieldError({ message }: { message?: string }) {
    if (!message) return null
    return (
        <styled.p mt="1" fontSize="xs" color="status.danger.fg">
            {message}
        </styled.p>
    )
}

import { useEffect, useState } from 'react'
import { styled } from '~/styled-system/jsx'
import type { Theme } from '~/lib/theme.server'

interface ThemeToggleProps {
    initialTheme: Theme
}

/**
 * Sun / moon icon button that toggles between light and dark.
 *
 * The active theme is reflected on <html class="dark|light">. Click flips the
 * class immediately (no flash, no SSR round-trip), then POSTs to /api/theme
 * so the cookie sticks for the next request.
 */
export function ThemeToggle({ initialTheme }: ThemeToggleProps) {
    const [theme, setTheme] = useState<Theme>(initialTheme)

    // Keep button label/icon in sync if another tab toggled the theme
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const next = document.documentElement.dataset.theme
            if (next === 'dark' || next === 'light') setTheme(next)
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        return () => observer.disconnect()
    }, [])

    const onToggle = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark'

        // Apply immediately so paint reflects the change before the request lands.
        document.documentElement.classList.remove(theme)
        document.documentElement.classList.add(next)
        document.documentElement.dataset.theme = next
        setTheme(next)

        // Persist (fire-and-forget; the visual change has already happened).
        const form = new FormData()
        form.set('theme', next)
        void fetch('/api/theme', { method: 'POST', body: form, credentials: 'same-origin' })
    }

    const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

    return (
        <styled.button
            type="button"
            onClick={onToggle}
            aria-label={label}
            title={label}
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            w="10"
            h="10"
            // Adapts to the header surface (white-ish on dark body in dark theme,
            // dark indigo on off-white body in light theme).
            color="text.primary"
            bgColor="transparent"
            border="none"
            cursor="pointer"
            borderRadius="md"
            _hover={{ bgColor: 'overlay.subtle' }}
            _focus={{ outline: '[2px solid token(colors.indigo.7)]', outlineOffset: '[2px]' }}
        >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </styled.button>
    )
}

function SunIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </svg>
    )
}

function MoonIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    )
}

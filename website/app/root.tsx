import type { LinksFunction } from 'react-router'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'

import { Settings } from 'luxon'
import { requireUser } from '~/lib/auth.server'
import { token } from '~/styled-system/tokens'
import type { Route } from './+types/root'
import './index.css'

Settings.throwOnInvalid = true
declare module 'luxon' {
    interface TSSettings {
        throwOnInvalid: true
    }
}

/**
 * When `WEBSITE_AUTH_REQUIRED` is on (staging) the entire site is gated.
 * `/auth/*` paths are exempted so the login flow still works. The admin
 * area has its own gate in `admin.tsx`, which stays in effect in both envs.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
    if (!context.config.websiteAuthRequired) return null

    const url = new URL(request.url)
    if (url.pathname.startsWith('/auth/')) return null

    await requireUser(request, context)
    return null
}

export const links: LinksFunction = () => {
    return [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossOrigin: 'anonymous',
        },
        {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap',
        },
    ]
}

export default function App() {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <Meta />
                <Links />
                <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
            </head>
            <body style={{ backgroundColor: token('colors.surface.body') }}>
                <Outlet />
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    )
}

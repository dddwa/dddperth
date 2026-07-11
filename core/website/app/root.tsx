import type { LinksFunction } from 'react-router'
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from 'react-router'

import { Settings } from 'luxon'
import { useRef } from 'react'
import { requireUser } from '~/lib/auth.server'
import { readThemeCookie } from '~/lib/theme.server'
import type { Theme } from '~/lib/theme.server'
import type { Route } from './+types/root'
import './index.css'
import { getConfig } from '~/remix-app-load-context'

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
    const theme = readThemeCookie(request)

    if (!getConfig(context).websiteAuthRequired) return { theme }

    const url = new URL(request.url)
    if (url.pathname.startsWith('/auth/')) return { theme }

    await requireUser(request, context)
    return { theme }
}

/**
 * Pre-paint inline script that decides the colour scheme from the `__theme`
 * cookie before stylesheets apply.
 *
 * Why: HTML responses carry `Cache-Control: max-age=300`, so the browser may
 * serve a stale-themed copy after the user toggles. With this script the SSR
 * value becomes a hint, not a commitment — whatever the browser cached,
 * `<html class>` and `data-theme` get rewritten before the first paint.
 *
 * Notes:
 * - Synchronous + first child of <head>: must block before CSS applies.
 * - Wrapped in try/catch so a denied cookie context can't crash the page.
 * - Listens for bfcache `pageshow` because Safari's back-forward cache can
 *   restore a DOM where the script already ran but the cookie has since
 *   changed (this is the same pattern next-themes uses).
 * - The matching `suppressHydrationWarning` on <html> is necessary because
 *   this script can legitimately disagree with the SSR'd attributes.
 */
const themeBootstrap = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)__theme=(light|dark)\\b/);var t=m?m[1]:'dark';var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.dataset.theme=t;}catch(e){}})();
window.addEventListener('pageshow',function(e){if(!e.persisted)return;try{var m=document.cookie.match(/(?:^|;\\s*)__theme=(light|dark)\\b/);var t=m?m[1]:'dark';var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.dataset.theme=t;}catch(_){}});`

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
    const data = useLoaderData<typeof loader>()
    // Pin the theme to the value present at first render. After hydration the
    // bootstrap script + ThemeToggle own <html class>/data-theme via direct DOM
    // mutation; if we kept binding these attrs to loader data, every client-side
    // navigation that re-ran the root loader with a stale __theme cookie (the
    // toggle POSTs it fire-and-forget, so concurrent navigations race the write)
    // would let React reconcile the user's choice back to the cookie value.
    const themeRef = useRef<Theme>(data?.theme ?? 'dark')
    const theme = themeRef.current
    return (
        // suppressHydrationWarning: the pre-paint script may rewrite
        // `className`/`data-theme` after a cached HTML response is served with
        // a stale SSR theme. The warning is scoped to this one element.
        <html lang="en" className={theme} data-theme={theme} suppressHydrationWarning>
            <head>
                {/* Must be the FIRST child of <head>: blocks before any
                    stylesheet applies so the page paints with the right theme. */}
                <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <Meta />
                <Links />
                <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
            </head>
            <body>
                <Outlet />
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    )
}

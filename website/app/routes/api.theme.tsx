import { data, type ActionFunctionArgs } from 'react-router'
import { writeThemeCookie, type Theme } from '~/lib/theme.server'

/**
 * POST /api/theme  body=`theme=dark|light`
 *
 * Sets the colour-scheme preference cookie. The toggle applies the new theme
 * to <html> client-side immediately, then fires this in the background so the
 * choice survives reloads / SSR.
 */
export async function action({ request }: ActionFunctionArgs) {
    const form = await request.formData()
    const next = form.get('theme')
    if (next !== 'dark' && next !== 'light') {
        return data({ ok: false, error: 'invalid theme' }, { status: 400 })
    }

    return data(
        { ok: true, theme: next as Theme },
        { headers: { 'Set-Cookie': writeThemeCookie(next) } },
    )
}

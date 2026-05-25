import type { Route } from './+types/[robots.txt]'

export async function loader({ request }: Route.LoaderArgs) {
    const url = new URL(request.url)
    return new Response(['User-agent: *', 'Allow: /', `Sitemap: ${url.origin}/sitemap.xml`].join('\n'), {
        headers: {
            'Content-Type': 'text/plain',
        },
    })
}

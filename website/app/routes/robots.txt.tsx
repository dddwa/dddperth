import type { LoaderFunctionArgs } from 'react-router'

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url)
    return new Response(['User-agent: *', 'Allow: /', `Sitemap: ${url.origin}/sitemap.xml`].join('\n'), {
        headers: {
            'Content-Type': 'text/plain',
        },
    })
}

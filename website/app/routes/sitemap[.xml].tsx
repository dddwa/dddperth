import { getContentPages } from '~/lib/get-content-pages.server'

export async function loader() {
    // Get the current date in ISO format for the lastmod field
    const today = new Date().toISOString().split('T')[0]

    // Define your main routes
    const mainRoutes = [
        {
            path: '/',
            lastmod: today,
            changefreq: 'weekly',
            priority: 1.0,
        },
        {
            path: '/agenda',
            lastmod: today,
            changefreq: 'weekly',
            priority: 0.8,
        },
    ]

    // Get all content pages
    const contentPages = getContentPages()

    // Combine all routes
    const allRoutes = [...mainRoutes, ...contentPages]

    // Generate the sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
    .map(
        (route) => `  <url>
    <loc>https://dddperth.com${route.path}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
    )
    .join('\n')}
</urlset>`

    // Return the sitemap with the appropriate content type
    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600',
        },
    })
}

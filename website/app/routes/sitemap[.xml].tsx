import fs from 'fs'
import path from 'path'

// Function to get all content pages from the website-content directory
const getContentPages = () => {
    const contentDir = path.join(process.cwd(), '..', 'website-content', 'pages')
    try {
        const files = fs.readdirSync(contentDir)
        return files
            .filter((file) => file.endsWith('.mdx'))
            .map((file) => ({
                path: `/${file.replace('.mdx', '')}`,
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: 'monthly',
                priority: 0.7,
            }))
    } catch (error) {
        console.error('Error reading content directory:', error)
        return []
    }
}

export const loader = async () => {
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

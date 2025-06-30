import fs from 'fs'
import path from 'path'

// Function to get all content pages from the website-content directory
export function getContentPages() {
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

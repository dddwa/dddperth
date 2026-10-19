import { describe, expect, it, vi } from 'vitest'

vi.mock('virtual:mdx-bundles', () => {
    const entry = (frontmatter: Record<string, unknown>) => ({ frontmatter, load: vi.fn(), code: vi.fn() })
    return {
        default: {
            page: {},
            // Directory order, as the bundle index produces it: oldest first.
            blog: {
                '2017-09-01-oldest': entry({ title: 'Oldest', date: new Date('2017-09-01') }),
                '2021-12-13-middle': entry({ title: 'Middle', date: new Date('2021-12-13') }),
                '2025-12-18-newest': entry({ title: 'Newest', date: new Date('2025-12-18') }),
            },
        },
    }
})

const { createMdxContentService } = await import('./mdx-content-service.server')

describe('createMdxContentService', () => {
    it('lists blog posts newest first', async () => {
        const posts = await createMdxContentService().getPagesList('blog')
        expect(posts.map((p) => p.slug)).toEqual(['2025-12-18-newest', '2021-12-13-middle', '2017-09-01-oldest'])
    })
})

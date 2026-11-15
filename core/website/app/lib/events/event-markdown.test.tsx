import { renderToStaticMarkup } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import { EventMarkdown } from './event-markdown'
import { eventSummary, renderEventMarkdown } from './event-markdown.server'
import { eventSlug } from './event-slug'

/** The description as the event page would render it. */
async function html(markdown: string): Promise<string> {
    const tree = await renderEventMarkdown(markdown)
    // AppLink renders a router <Link> for internal paths, so it needs a router.
    const Stub = createRoutesStub([{ path: '/', Component: () => <EventMarkdown tree={tree} /> }])
    return renderToStaticMarkup(<Stub initialEntries={['/']} />)
}

describe('event descriptions', () => {
    it('renders Markdown, including GFM lists and links', async () => {
        const out = await html('Come along for **pizza**.\n\n- Talks\n- Networking\n\n[Venue](https://venue.example)')
        expect(out).toContain('<strong>pizza</strong>')
        expect(out).toMatch(/<ul[^>]*>.*<li>Talks<\/li>/s)
        expect(out).toMatch(/<a[^>]*href="https:\/\/venue.example"[^>]*target="_blank"/)
    })

    it('drops raw HTML rather than rendering it', async () => {
        const out = await html('Hi <script>alert(1)</script> <img src=x onerror="alert(1)"> <b onclick="x()">bold</b>')
        expect(out).not.toMatch(/<script|onerror|onclick|<b[ >]/)
        expect(out).toContain('Hi')
    })

    it('strips dangerous link and image URLs but keeps safe ones', async () => {
        const tree = await renderEventMarkdown(
            '[a](javascript:alert(1)) [b](JAVASCRIPT:alert(1)) [c](data:text/html,x) [d](//evil.example) ' +
                '[e](/agenda) [f](mailto:hi@example.test) ![g](javascript:alert(1))',
        )
        const urls: unknown[] = []
        JSON.stringify(tree, (key, value) => {
            if (key === 'href' || key === 'src') urls.push(value)
            return value
        })
        // Only the site-relative path and the mailto: survive; the rest lose their href/src.
        expect(urls).toEqual(['/agenda', 'mailto:hi@example.test'])
    })

    it('moves headings down a level, since the page title is the only h1', async () => {
        const out = await html('# Big\n\n## Smaller\n\n###### Tiny')
        expect(out).not.toContain('<h1')
        expect(out).toMatch(/<h2[^>]*>Big<\/h2>/)
        expect(out).toMatch(/<h3[^>]*>Smaller<\/h3>/)
        expect(out).toMatch(/<h6[^>]*>Tiny<\/h6>/)
    })

    it('summarises as plain text, cut at a word', async () => {
        expect(eventSummary(await renderEventMarkdown('**Pizza** and [talks](https://x.example).'))).toBe(
            'Pizza and talks.',
        )
        expect(eventSummary(await renderEventMarkdown('one two three four'), 12)).toBe('one two…')
    })
})

describe('eventSlug', () => {
    it('makes a readable URL segment from the title', () => {
        expect(eventSlug("DDD Perth: Speaker's Workshop #2", 'abc')).toBe('ddd-perth-speakers-workshop-2')
        expect(eventSlug('Café Meetup', 'abc')).toBe('cafe-meetup')
    })

    it('falls back to the id when the title has nothing usable', () => {
        expect(eventSlug('🎉🎉', '1234abcd-ef')).toBe('event-1234abcd')
    })
})

import { describe, expect, it } from 'vitest'
import { action, loader } from './portal.$'

type LoaderArgs = Parameters<typeof loader>[0]

function args(url: string, splat?: string): LoaderArgs {
    return { request: new Request(url), params: { '*': splat } } as unknown as LoaderArgs
}

describe('/portal redirect', () => {
    it('sends the old root to /sponsor-portal', () => {
        const response = loader(args('https://example.com/portal'))
        expect(response.status).toBe(308)
        expect(response.headers.get('Location')).toBe('/sponsor-portal')
    })

    it('keeps the rest of the path and the query string', () => {
        const response = loader(args('https://example.com/portal/feedback?edit=fb-1', 'feedback'))
        expect(response.headers.get('Location')).toBe('/sponsor-portal/feedback?edit=fb-1')
    })

    it('redirects posts too, preserving the method', () => {
        const response = action(args('https://example.com/portal/profile', 'profile'))
        expect(response.status).toBe(308)
        expect(response.headers.get('Location')).toBe('/sponsor-portal/profile')
    })
})

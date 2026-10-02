import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../../../public/runsheets-sw.js', import.meta.url), 'utf8')
const origin = 'https://example.test'
type CacheKey = Request | URL | string
const href = (key: CacheKey) => new URL(key instanceof Request ? key.url : String(key), origin).href

// Exercise the shipped worker's event handlers, including waitUntil work.
// Responses are cloned on both read and write, as in the browser Cache API.
function worker() {
    const stores = new Map<string, Map<string, Response>>()
    const open = async (name: string) => {
        const entries = stores.get(name) ?? new Map<string, Response>()
        stores.set(name, entries)
        return {
            keys: async () => [...entries.keys()].map((url) => new Request(url)),
            put: async (key: CacheKey, response: Response) => {
                entries.set(href(key), response.clone())
            },
            match: async (key: CacheKey, options?: { ignoreSearch?: boolean }) => {
                const url = href(key)
                const match = options?.ignoreSearch
                    ? [...entries].find(([entry]) => entry.split('?')[0] === url.split('?')[0])?.[1]
                    : entries.get(url)
                return match?.clone()
            },
        }
    }
    type WorkerEvent = {
        data?: { type: string; urls: string[] }
        request?: Request
        waitUntil: (promise: Promise<unknown>) => void
        respondWith: (promise: Promise<Response>) => void
    }
    const handlers = new Map<string, (event: WorkerEvent) => void>()
    const fetch = vi.fn<(key: CacheKey) => Promise<Response>>().mockRejectedValue(new Error('offline'))
    const claim = vi.fn()
    runInNewContext(source, {
        self: {
            location: { origin },
            addEventListener: (name: string, handler: (event: WorkerEvent) => void) => handlers.set(name, handler),
            clients: { claim },
        },
        caches: { open, keys: async () => [...stores.keys()], delete: async (name: string) => stores.delete(name) },
        fetch,
        URL,
        Request,
        setTimeout,
    })
    function dispatch(name: string, fields: Partial<WorkerEvent> = {}) {
        const pending: Promise<unknown>[] = []
        let response: Promise<Response> | undefined
        handlers.get(name)?.({
            ...fields,
            waitUntil: (promise) => {
                pending.push(promise)
            },
            respondWith: (promise) => {
                response = promise
            },
        })
        return { response, done: Promise.all(pending) }
    }
    return { open, stores, fetch, claim, dispatch }
}

const html = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
const request = (path = '/runsheets') => new Request(origin + path)

afterEach(() => vi.useRealTimers())

describe('run sheet service worker upgrades', () => {
    it('migrates offline pages and assets without a message from the old tab, dropping unrelated data', async () => {
        const sw = worker()
        const previous = await sw.open('runsheets-v1')
        for (const path of [
            '/runsheets',
            '/runsheets.data',
            '/runsheets/bump-in',
            '/assets/old.js',
            '/api/runsheets/session/1',
            '/admin.data',
            'https://other.test/runsheets',
        ]) {
            await previous.put(path, new Response(path))
        }
        await sw.open('another-app')
        await sw.dispatch('activate').done
        expect(sw.claim).toHaveBeenCalledOnce()
        expect(sw.fetch).not.toHaveBeenCalled()
        expect([...sw.stores.keys()]).toEqual(['another-app', 'runsheets-v2'])
        const saved = await sw.open('runsheets-v2')
        expect((await saved.keys()).map((key) => new URL(key.url).pathname)).toEqual([
            '/runsheets',
            '/runsheets.data',
            '/runsheets/bump-in',
            '/assets/old.js',
            '/api/runsheets/session/1',
        ])
        const offline = sw.dispatch('fetch', { request: request() })
        expect(await (await offline.response)?.text()).toBe('/runsheets')
        await offline.done
    })

    it('does not overwrite entries already saved by the current worker during migration', async () => {
        const sw = worker()
        await (await sw.open('runsheets-v1')).put('/runsheets', html('old'))
        await (await sw.open('runsheets-v2')).put('/runsheets', html('current'))
        await sw.dispatch('activate').done
        expect(await (await (await sw.open('runsheets-v2')).match('/runsheets'))?.text()).toBe('current')
    })

    it('seeds the assets from the fetched HTML even when the tab sends the old build URLs', async () => {
        const sw = worker()
        const document =
            '<link rel="stylesheet" href="/assets/new.css"><link rel="modulepreload" href="/assets/shared.js"><script type="module">import("/assets/new.js")</script>'
        sw.fetch.mockImplementation(async (key) =>
            href(key) === origin + '/runsheets' ? html(document) : new Response('asset'),
        )
        await sw.dispatch('message', {
            data: { type: 'cache-urls', urls: [origin + '/runsheets', origin + '/assets/old.js'] },
        }).done
        const saved = await sw.open('runsheets-v2')
        for (const path of ['/assets/new.css', '/assets/shared.js', '/assets/new.js'])
            expect(await saved.match(path)).toBeDefined()
        expect(await (await saved.match('/runsheets'))?.text()).toBe(document)
    })

    it('keeps old HTML when a replacement asset fails, while returning the fresh online response', async () => {
        const sw = worker()
        const saved = await sw.open('runsheets-v2')
        await saved.put('/runsheets', html('old page'))
        await saved.put('/assets/old.js', new Response('old script'))
        sw.fetch.mockImplementation(async (key) =>
            href(key) === origin + '/runsheets'
                ? html('<script src="/assets/new.js"></script>')
                : new Response('unavailable', { status: 503 }),
        )
        const online = sw.dispatch('fetch', { request: request() })
        expect(await (await online.response)?.text()).toContain('/assets/new.js')
        await online.done
        expect(await (await saved.match('/runsheets'))?.text()).toBe('old page')
        expect(await saved.match('/assets/old.js')).toBeDefined()
    })

    it('commits new HTML only after its assets finish, without delaying the online response', async () => {
        const sw = worker()
        const saved = await sw.open('runsheets-v2')
        await saved.put('/runsheets', html('old page'))
        let finishAsset!: (response: Response) => void
        const asset = new Promise<Response>((resolve) => {
            finishAsset = resolve
        })
        sw.fetch.mockImplementation(async (key) =>
            href(key) === origin + '/runsheets' ? html('<script src="/assets/new.js"></script>') : asset,
        )
        const online = sw.dispatch('fetch', { request: request() })
        expect(await (await online.response)?.text()).toContain('/assets/new.js')
        expect(await (await saved.match('/runsheets'))?.text()).toBe('old page')
        finishAsset(new Response('new script'))
        await online.done
        expect(await (await saved.match('/runsheets'))?.text()).toContain('/assets/new.js')
        expect(await (await saved.match('/assets/new.js'))?.text()).toBe('new script')
    })

    it('falls back if response headers arrive but the body stalls', async () => {
        vi.useFakeTimers()
        const sw = worker()
        const saved = await sw.open('runsheets-v2')
        await saved.put('/runsheets.data', new Response('saved data'))
        let body!: ReadableStreamDefaultController<Uint8Array>
        sw.fetch.mockResolvedValue(
            new Response(
                new ReadableStream<Uint8Array>({
                    start(controller) {
                        body = controller
                    },
                }),
            ),
        )
        const event = sw.dispatch('fetch', { request: request('/runsheets.data') })
        await vi.advanceTimersByTimeAsync(4000)
        expect(await (await event.response)?.text()).toBe('saved data')
        body.enqueue(new TextEncoder().encode('fresh data'))
        body.close()
        await event.done
        expect(await (await saved.match('/runsheets.data'))?.text()).toBe('fresh data')
    })

    it('still falls back after four seconds and saves data when the network eventually responds', async () => {
        vi.useFakeTimers()
        const sw = worker()
        const saved = await sw.open('runsheets-v2')
        await saved.put('/runsheets.data', new Response('saved data'))
        let finish!: (response: Response) => void
        sw.fetch.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finish = resolve
                }),
        )
        const event = sw.dispatch('fetch', { request: request('/runsheets.data') })
        await vi.advanceTimersByTimeAsync(4000)
        expect(await (await event.response)?.text()).toBe('saved data')
        finish(new Response('fresh data'))
        await event.done
        expect(await (await saved.match('/runsheets.data'))?.text()).toBe('fresh data')
    })
})

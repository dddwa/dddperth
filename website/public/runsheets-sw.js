// Offline copy of the volunteer run sheets, registered by the /runsheets and
// /runsheets/bump-in pages with scope `/runsheets`. The page's HTML and data go to the network first;
// the last successful copy is kept, and served only when the network fails or
// is too slow to answer. Network-first means an online volunteer never sees a
// stale run sheet from here — the page's "last updated" time says how old any
// copy shown offline is. Build assets are content-hashed, so a cached copy of
// one is never stale and is served without asking the network.
//
// Only run sheet requests are cached. A page this worker controls can still
// navigate client-side to another page, but those requests pass straight
// through, so nothing from the rest of the site (an admin page, say) is kept.
//
// To retire this worker, replace this file with one that unregisters itself.
// Don't delete it: a browser keeps running the worker it has when the update
// check gets a 404.

const CACHE = 'runsheets-v2'

/**
 * How long the run sheet's HTML and data wait for the network before
 * falling back to a cached copy. Venue Wi-Fi tends to hang rather than fail,
 * and `navigator.onLine` stays true throughout, so without a limit a reload
 * waits minutes for the browser to give up.
 */
const NETWORK_TIMEOUT_MS = 4000

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            // Old tabs do not have the new page's cache-urls handler. Keep
            // their offline copy without needing a network request or message.
            // Copy only allowed URLs: v1 also cached unrelated pages' data.
            const cache = await caches.open(CACHE)
            for (const name of await caches.keys()) {
                if (!name.startsWith('runsheets-') || name === CACHE) continue
                const previous = await caches.open(name)
                for (const request of await previous.keys()) {
                    const url = new URL(request.url)
                    if (url.origin !== self.location.origin || !isCacheable(url)) continue
                    if (await cache.match(request)) continue
                    const response = await previous.match(request)
                    if (response) await cache.put(request, response)
                }
                // Only discard the old cache after all allowed entries copied.
                await caches.delete(name)
            }
            await self.clients.claim()
        })(),
    )
})

function isCacheable(url) {
    return (
        url.pathname === '/runsheets' ||
        url.pathname.startsWith('/runsheets.') ||
        url.pathname.startsWith('/runsheets/') ||
        url.pathname.startsWith('/api/runsheets/') ||
        url.pathname.startsWith('/assets/') ||
        url.pathname === '/__manifest'
    )
}

self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)
    if (request.method !== 'GET' || url.origin !== self.location.origin || !isCacheable(url)) return
    event.respondWith(url.pathname.startsWith('/assets/') ? cacheFirst(request) : networkFirst(event))
})

// The page sends every URL it loaded, since this worker may not have seen
// them: on a first visit it started after they loaded. Without this, opening
// the run sheet once and then losing signal leaves nothing saved. The `.data` URL
// is always fetched, as the page only otherwise requests it when it refreshes.
self.addEventListener('message', (event) => {
    if (event.data?.type !== 'cache-urls' || !Array.isArray(event.data.urls)) return
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE)
            await Promise.all(
                event.data.urls.map(async (href) => {
                    const url = new URL(href, self.location.origin)
                    if (url.origin !== self.location.origin || !isCacheable(url)) return
                    if (!url.pathname.endsWith('.data') && (await cache.match(url))) return
                    try {
                        const response = await fetch(url)
                        if (response.ok) await saveResponse(url, response)
                    } catch {
                        // Still offline-capable for whatever did save.
                    }
                }),
            )
        })(),
    )
})

async function cacheFirst(request) {
    const cache = await caches.open(CACHE)
    const cached = await cache.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
}

// React Router's production HTML includes /assets/ URLs in stylesheet and
// modulepreload links, inline imports, and its route manifest. That includes
// the entry/route modules' eager dependencies. Read this response's URLs,
// not the old tab's performance entries: a deployment may have changed them.
async function saveResponse(request, response) {
    if (response.headers.get('Content-Type')?.includes('text/html')) {
        const html = await response.clone().text()
        const assets = new Set(Array.from(html.matchAll(/["'](\/assets\/[^"'<>\\\s]+)["']/g), (match) => match[1]))
        await Promise.all(
            Array.from(assets, async (path) => {
                const asset = await cacheFirst(new Request(new URL(path, self.location.origin)))
                if (!asset.ok) throw new Error(`Could not save run sheet asset: ${path}`)
            }),
        )
    }
    // Commit HTML last. If a script/style failed or hung, the previous HTML
    // and its hashed assets remain usable, even after the worker is stopped.
    await (await caches.open(CACHE)).put(request, response)
}

async function cachedCopy(request) {
    const cache = await caches.open(CACHE)
    // Filters only change the query string, and every copy holds the whole
    // run sheet (the page filters it itself), so a filter never viewed
    // offline can still be served from another's copy.
    return (await cache.match(request)) ?? (await cache.match(request, { ignoreSearch: true }))
}

async function networkFirst(event) {
    const { request } = event
    const network = fetch(request).then(async (response) => {
        // Include a stalled response body in the four-second fallback, too.
        // Asset downloads below are separate from this network deadline.
        if (response.ok) await response.clone().arrayBuffer()
        return response
    })
    // Save in the background: downloading an offline bundle must not delay
    // a good network response, or turn a cache-write failure into a page error.
    // Clone before handing the response body to the browser.
    event.waitUntil(
        network.then((response) => (response.ok ? saveResponse(request, response.clone()) : undefined)).catch(() => {}),
    )

    const cached = await cachedCopy(request)
    if (!cached) return network

    const timedOut = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS))
    try {
        const response = await Promise.race([network, timedOut])
        // A server error (Jira down, say) would replace the run sheet with an
        // error page, when the saved copy is still the best there is.
        return response && response.status < 500 ? response : cached
    } catch {
        return cached
    }
}

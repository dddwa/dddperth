// Offline copy of the volunteer run sheet, registered by the /runsheets page
// with scope `/runsheets`. The page's HTML and data go to the network first;
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
            // Drop copies kept by an older version of this worker.
            for (const name of await caches.keys()) {
                if (name.startsWith('runsheets-') && name !== CACHE) await caches.delete(name)
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
// them: on a first visit it started after they loaded, and after an update the
// previous worker's copies were dropped. Without this, a volunteer who opens
// the run sheet once and then loses signal has nothing saved. The `.data` URL
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
                        if (response.ok) await cache.put(url, response)
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
        if (response.ok) await (await caches.open(CACHE)).put(request, response.clone())
        return response
    })
    // Keeps the worker alive to save the response if the timeout below
    // answers first, so the next load has the newer copy.
    event.waitUntil(network.catch(() => {}))

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

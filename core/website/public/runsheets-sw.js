// Offline copy of the volunteer run sheet, registered by the /runsheets page
// with scope `/runsheets`, so it only controls that page. Everything the page
// loads (its HTML, data, scripts, the session modal's details) goes to the
// network first; the last successful copy is kept, and served only when the
// network fails. Network-first means an online volunteer never sees a stale
// run sheet from here — the page's "last updated" time says how old any copy
// shown offline is.
//
// Only public data passes through: the run sheet page and the published
// agenda are anonymous, and this worker never sees another page's requests.

const CACHE = 'runsheets-v1'

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

self.addEventListener('fetch', (event) => {
    const { request } = event
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
    event.respondWith(networkFirst(request))
})

async function networkFirst(request) {
    const cache = await caches.open(CACHE)
    try {
        const response = await fetch(request)
        if (response.ok) await cache.put(request, response.clone())
        return response
    } catch (error) {
        // Filters only change the query string, and every copy holds the
        // whole run sheet (the page filters it itself), so a filter never
        // viewed offline can still be served from another's copy.
        const cached = (await cache.match(request)) ?? (await cache.match(request, { ignoreSearch: true }))
        if (cached) return cached
        throw error
    }
}

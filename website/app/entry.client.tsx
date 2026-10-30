import { initializeTemporal } from '~/lib/dates/temporal'

async function start() {
    await initializeTemporal()
    await import('./hydrate.client')
}

void start().catch((error: unknown) => {
    console.error('Unable to start the application', error)
})

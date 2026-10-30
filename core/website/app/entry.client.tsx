import { initializeTemporal } from '~/lib/dates/temporal'

async function start() {
    await initializeTemporal()
    const { hydrate } = await import('./hydrate.client')
    hydrate()
}

void start().catch((error: unknown) => {
    console.error('Unable to start the application', error)
})

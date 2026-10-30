import { HydratedRouter } from 'react-router/dom'
import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

// Exported and called, not run on import: `sideEffects: false` in package.json
// lets the bundler drop a module that is imported only for its side effects,
// and a clean production build did exactly that, shipping a site that never hydrated.
export function hydrate() {
    startTransition(() => {
        hydrateRoot(
            document,
            <StrictMode>
                <HydratedRouter />
            </StrictMode>,
        )
    })
}

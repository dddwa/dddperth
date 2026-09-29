import { useCallback, useEffect, useRef, useState } from 'react'
import { useRevalidator } from 'react-router'

/**
 * POSTs board edits one at a time, then revalidates once the queue drains.
 *
 * A fetcher would abort an in-flight submit when a second edit lands close
 * behind it, so writes are chained through a manual promise queue instead —
 * which keeps every write, in submission order.
 *
 * `actionPath` must be a *resource* route (no default export), usually a
 * `<page>_.save.tsx` that re-exports the page's action. A plain `fetch` POST
 * to the page's own URL is a document request: React Router runs the action
 * and then renders the whole page as HTML, so the save lands but the reply
 * can't be read. A resource route answers with the action's result as JSON.
 * The action must answer `{ success: boolean; error?: string }`.
 */
export function useQueuedSave<Change extends Record<string, string>>(logLabel: string, actionPath: string) {
    const revalidator = useRevalidator()
    const queue = useRef<Promise<unknown>>(Promise.resolve())
    const [inFlight, setInFlight] = useState(0)
    const [saveError, setSaveError] = useState<string | null>(null)

    const save = useCallback(
        (change: Change) => {
            setInFlight((n) => n + 1)
            queue.current = queue.current
                .then(async () => {
                    const response = await fetch(actionPath, {
                        method: 'POST',
                        body: new URLSearchParams(change),
                    })
                    if (!response.ok) {
                        throw new Error(`Save failed (${response.status})`)
                    }
                    // An expired admin session redirects to the (HTML) login
                    // page, which fetch follows and reports as a 200.
                    if (!response.headers.get('Content-Type')?.includes('application/json')) {
                        throw new Error('Save failed — your session may have expired. Reload the page to sign in again.')
                    }
                    const result: { success: boolean; error?: string } = await response.json()
                    if (!result.success) {
                        throw new Error(result.error ?? 'Save failed')
                    }
                    setSaveError(null)
                })
                .catch((error: unknown) => {
                    console.error(`Failed to save ${logLabel}:`, error)
                    setSaveError(error instanceof Error ? error.message : 'Failed to save')
                })
                .finally(() => setInFlight((n) => n - 1))
        },
        [logLabel, actionPath],
    )

    const isSaving = inFlight > 0

    useEffect(() => {
        if (!isSaving && revalidator.state === 'idle') {
            void revalidator.revalidate()
        }
    }, [isSaving, revalidator])

    return { save, isSaving, saveError }
}

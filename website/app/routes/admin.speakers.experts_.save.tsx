/**
 * JSON endpoint for the Meet the Experts board's queued saves (see
 * `useQueuedSave` for why they can't post to the page's own URL). A resource
 * route — no default export — so React Router answers with the action's result.
 */
export { action } from './admin.speakers.experts'

/**
 * The `/events/<slug>` part of an event's URL: lowercase ASCII words joined
 * by hyphens, so it's readable when pasted into a chat. A title with nothing
 * usable in it (all emoji, say) falls back to part of the event's id.
 */
export function eventSlug(title: string, id: string): string {
    const slug = title
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/, '')
    return slug || `event-${id.slice(0, 8)}`
}

/** What an admin enters for an event. Dates are ISO strings with an offset,
 * in conference time; see `app/lib/events/event-form.ts`. */
export interface EventInput {
    title: string
    /** Markdown, rendered on the event's own page. */
    description: string
    startsAt: string
    endsAt: string | null
    location: string | null
    /** Optional link for the location, e.g. a map or the venue's site. */
    locationUrl: string | null
    url: string | null
    linkLabel: string | null
    published: boolean
}

export interface ConferenceEvent extends EventInput {
    id: string
    /** `/events/<slug>`. Set from the title on create, then never changed. */
    slug: string
    /** Unix seconds. */
    updatedAt: number
    updatedBy: string
}

export interface EventsStore {
    /** Every event, drafts included, soonest first. */
    list(): Promise<ConferenceEvent[]>
    get(id: string): Promise<ConferenceEvent | null>
    getBySlug(slug: string): Promise<ConferenceEvent | null>
    /** Returns the new event. Its slug comes from the title, made unique. */
    create(input: EventInput, updatedBy: string): Promise<ConferenceEvent>
    /** False when there's no event with that id. Leaves the slug alone. */
    update(id: string, input: EventInput, updatedBy: string): Promise<boolean>
    delete(id: string): Promise<void>
}

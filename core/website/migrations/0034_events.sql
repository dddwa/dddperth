-- Smaller events (meetups, socials, info nights...) created at /admin/events,
-- listed on the home page while they're upcoming, each with its own page at
-- /events/<slug>.
--
-- Not keyed by conference year: an event is shown from when it's published
-- until it ends, whichever conference is "current" at the time.
--
-- `starts_at` / `ends_at` are ISO datetimes with an offset, in conference
-- time (see core/docs/date-time.md). With no `ends_at` the event stays listed
-- until the end of its start day.

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    -- The /events/<slug> URL. Made from the title when the event is created
    -- and never changed after, so shared links keep working through a rename.
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    -- Markdown, rendered on the event's own page.
    description TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT,
    location TEXT,
    -- Optional link for the location, e.g. a Google Maps or venue page.
    location_url TEXT,
    -- Where "find out more / register" goes, and the button text for it.
    url TEXT,
    link_label TEXT,
    -- 0 = draft (admin only), 1 = shown on the home page.
    published INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    -- Email of the admin who last saved it.
    updated_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events (starts_at);

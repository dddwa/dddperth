-- Entries to the hidden competition forms at /competition/<slug>. Competitions
-- themselves are defined in the conference manifest (`competitions`), not
-- here; `competition_slug` ties an entry to one of them.
--
-- `email` is what the entrant typed (lowercased), for contacting the winner.
-- `email_key` is the same address normalised for duplicate detection — the
-- `+tag` dropped, and dots dropped for Gmail — so `jo+1@gmail.com` and
-- `j.o@gmail.com` count as the same person as `jo@gmail.com`. One entry per
-- `email_key` per competition; a second is refused rather than stored.
-- See `app/lib/competitions/competition-entry.ts`.

CREATE TABLE IF NOT EXISTS competition_entries (
    id TEXT PRIMARY KEY,
    competition_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    email_key TEXT NOT NULL,
    answer TEXT NOT NULL,
    -- Unix seconds the terms were accepted (the entry can't be saved without it).
    terms_accepted_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (competition_slug, email_key)
);

CREATE INDEX IF NOT EXISTS idx_competition_entries_slug ON competition_entries (competition_slug, created_at);

-- Agenda shortlisting: how many people have added each talk to their agenda.
--
-- Attendees build their agenda in localStorage (no account — there is no
-- attendee login, only the allowlisted admin/sponsor/speaker magic link), so
-- the browser is the only identity available. Each browser gets a random id in
-- an httpOnly cookie and one row per talk it shortlists. A count is then
-- COUNT(*) over the rows rather than a running integer, which makes toggling
-- idempotent: adding a talk twice from the same browser cannot inflate it, and
-- removing deletes the row rather than decrementing something that might have
-- drifted.
--
-- `browser_id` identifies a cookie jar, nothing more. It maps to no email, no
-- account and no session, and is never shown to anyone — but this table does
-- record which talks a given browser shortlisted, so it is read as organiser-
-- only data, not public.
--
-- **The number is a soft signal, not a headcount.** One person with a phone
-- and a laptop counts twice, clearing cookies counts again, and a determined
-- script with fresh cookie jars can still inflate a talk. It answers "is this
-- one unusually popular?" and must not be treated as a capacity measurement.
--
-- `signed_in` exists from the start although nothing sets it yet. Attendee
-- sign-in (for cross-device sync) is deferred, and when it arrives its counts
-- must stay separable from the anonymous ones: they have genuinely different
-- trust levels, and a single blended total would quietly mix a de-duplicated
-- figure with an inflatable one. Having the column now means no migration then.
--
-- Keyed by year so each conference's numbers are queryable on their own, and
-- past years stay readable rather than being cleaned up.

CREATE TABLE IF NOT EXISTS agenda_shortlist_picks (
    browser_id TEXT NOT NULL,
    year TEXT NOT NULL,
    -- Sessionize's session id. Deliberately not a foreign key: talks come from
    -- the Sessionize feed and can vanish from it mid-conference, and a pick
    -- should survive that rather than cascade away. The same reasoning as
    -- agenda_talk_planning.talk_id.
    talk_id TEXT NOT NULL,
    -- 0 for an anonymous browser, 1 once attendee sign-in exists. Kept as a
    -- column on the pick rather than a separate table so a browser that later
    -- signs in can be upgraded in place.
    signed_in INTEGER NOT NULL DEFAULT 0 CHECK (signed_in IN (0, 1)),
    created_at INTEGER NOT NULL,
    PRIMARY KEY (browser_id, year, talk_id)
);

-- The read path is "counts for every talk in one year", grouped by talk.
CREATE INDEX IF NOT EXISTS idx_agenda_shortlist_year_talk
    ON agenda_shortlist_picks (year, talk_id);

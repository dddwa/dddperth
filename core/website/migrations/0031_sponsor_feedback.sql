-- Sponsor feedback, collected through the sponsor portal after the conference.
--
-- Feedback belongs to the sponsor (issue key), not the contact who wrote it:
-- the portal is a shared workspace, so any contact can read and edit their
-- company's submissions, the same way they share the profile. `submitted_by`
-- and `updated_by` record who did what.
--
-- A sponsor can submit more than once — someone else on their team may have
-- something to add, or they come back with a new idea — so there is no unique
-- key on (year, issue_key).
--
-- `testimonial_consent` is separate from the testimonial text because a quote
-- written into the form is not permission to publish it.

CREATE TABLE IF NOT EXISTS sponsor_feedback (
    id TEXT PRIMARY KEY,
    year TEXT NOT NULL,
    issue_key TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    experience TEXT,
    ideas TEXT,
    testimonial TEXT,
    testimonial_attribution TEXT,
    testimonial_consent INTEGER NOT NULL DEFAULT 0,
    portal_feedback TEXT,
    submitted_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_feedback_year_issue ON sponsor_feedback (year, issue_key);

-- One row per feedback request email sent from /admin/sponsors/feedback, so
-- the committee can see who was asked, at which addresses, and when.
-- `recipients` is a JSON array of the addresses in the To: field.

CREATE TABLE IF NOT EXISTS sponsor_feedback_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    issue_key TEXT NOT NULL,
    recipients TEXT NOT NULL,
    sent_at INTEGER NOT NULL,
    sent_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_feedback_requests_year ON sponsor_feedback_requests (year, issue_key);

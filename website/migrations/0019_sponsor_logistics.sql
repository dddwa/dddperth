-- Sponsor-supplied logistics (exhibition/bump-in, raffle, Optus screen
-- orders, induction, social quote).
--
-- Stored as one JSON blob rather than ~19 columns: the venue's form changes
-- shape between years, the app never queries an individual answer (it reads
-- the whole set to render the form and to push into Jira), and Jira remains
-- the committee's queryable copy. A column per field would mean a migration
-- every time the venue adds a question.
ALTER TABLE sponsor_profiles ADD COLUMN logistics_json TEXT;

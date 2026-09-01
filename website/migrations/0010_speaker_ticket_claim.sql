-- Speaker portal: track whether a speaker has claimed their complimentary ticket
--
-- Self-reported from the dashboard checklist — there's no Tito API hookup
-- for this yet, so it's a plain "I've done it" timestamp, same idiom as
-- completed_at.

ALTER TABLE speaker_profiles ADD COLUMN ticket_claimed_at INTEGER;

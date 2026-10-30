-- Meet the Experts no longer takes per-seat feedback (see 0029), so the
-- conference feedback form asks about it as a whole instead. Nullable: it's
-- optional on the form, and every row before this has no answer.

ALTER TABLE conference_feedback ADD COLUMN meet_the_experts TEXT;

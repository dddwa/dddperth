-- Breaks on the agenda planner board
--
-- Organizers need to see what falls before and after morning tea / lunch
-- while building the agenda, so a slot can now be a break rather than a talk
-- placeholder.
--
-- Modelled as a kind on the existing slot rather than a separate table: a
-- break occupies a row in a track exactly like a talk slot does, so it reuses
-- the add/remove/reorder plumbing and keeps a track's ordering in one place.
--
-- 'talk'  — a placeholder a talk can be dropped into (the existing behaviour)
-- 'break' — a labelled divider (Morning Tea, Lunch); never holds a talk
--
-- Existing rows are all talk slots, hence the default.
ALTER TABLE agenda_slot ADD COLUMN kind TEXT NOT NULL DEFAULT 'talk';

-- Break slots carry their label here. Talk slots leave it NULL and take their
-- label from the talk they hold.
ALTER TABLE agenda_slot ADD COLUMN label TEXT;

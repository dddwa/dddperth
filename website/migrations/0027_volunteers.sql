-- Volunteers: an admin-managed list of people, and their per-slot roles.
--
-- The schedule's rows and columns aren't DB tables — they're the agenda's
-- time slots and rooms, read from Sessionize the same way the public agenda
-- page does. An assignment just records (slot_id, room_id) as Sessionize
-- gives them: slot_id is the grid's `slotStart` ("09:30:00"), room_id is the
-- Sessionize room id.
--
-- Roles (`role`, and `roles_json` — the roles a volunteer is willing to do)
-- are deliberately unconstrained: the set of roles lives in code
-- (VOLUNTEER_ROLES), and SQLite can't alter a CHECK constraint, so adding a
-- role later shouldn't need a table rebuild.
--
-- Volunteers aren't per year (people come back); assignments are.

CREATE TABLE IF NOT EXISTS volunteers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    roles_json TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Several people can share a role in a room (two photographers for a
-- keynote), so there's no uniqueness on the seat itself.
CREATE TABLE IF NOT EXISTS volunteer_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    slot_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    role TEXT NOT NULL,
    volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    assigned_at INTEGER NOT NULL,
    assigned_by TEXT NOT NULL,
    -- A person can only be in one place during any given slot.
    UNIQUE (year, slot_id, volunteer_id)
);

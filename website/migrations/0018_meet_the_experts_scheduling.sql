-- Meet the Experts: table/timeslot scheduling
--
-- Registrants (speakers or sponsors) already record which configured time
-- slots they're willing to do in meet_the_experts_registrations. This adds
-- the admin-facing scheduling layer on top: a number of admin-created tables,
-- and the assignment of a registrant to a (table, slot) cell. Slots
-- themselves aren't a DB table — they're the same `meetTheExperts.slots`
-- list from the conference manifest that registrants already picked from.

CREATE TABLE IF NOT EXISTS meet_the_experts_tables (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meet_the_experts_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id TEXT NOT NULL REFERENCES meet_the_experts_tables(id) ON DELETE CASCADE,
    slot_id TEXT NOT NULL,
    registrant_type TEXT NOT NULL CHECK (registrant_type IN ('speaker', 'sponsor')),
    registrant_id TEXT NOT NULL,
    assigned_at INTEGER NOT NULL,
    assigned_by TEXT NOT NULL,
    -- At most one occupant per table per slot.
    UNIQUE (table_id, slot_id),
    -- A person can only be seated at one table for any given slot.
    UNIQUE (slot_id, registrant_type, registrant_id)
);

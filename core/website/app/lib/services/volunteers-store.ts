/**
 * The roles a volunteer can be rostered into. Every room in every agenda slot
 * gets a seat per role, and each volunteer is marked with the roles they'll
 * do. Add a role here and it appears in the admin grid — the DB doesn't
 * constrain roles, so no migration is needed.
 */
/**
 * Each id is its Jira "Volunteer Team" label minus the `team-` prefix
 * (`team-room-coordinators`), which is how the run sheet finds a filtered
 * team's info links in /admin/settings/volunteers.
 */
export const VOLUNTEER_ROLES = [
    { id: 'room-coordinators', label: 'Room coordinator' },
    { id: 'photographers', label: 'Photographer' },
] as const

export type VolunteerRole = (typeof VOLUNTEER_ROLES)[number]['id']

export function isVolunteerRole(value: string): value is VolunteerRole {
    return VOLUNTEER_ROLES.some((role) => role.id === value)
}

export interface Volunteer {
    id: string
    name: string
    email: string | null
    /** The roles they can be rostered into. */
    roles: VolunteerRole[]
}

/**
 * Slots and rooms aren't stored — they're the agenda's Sessionize time slots
 * (`slotStart`) and room ids, so an assignment just records those keys. A
 * seat (slot, room, role) can hold several volunteers.
 */
export interface VolunteerAssignment {
    slotId: string
    roomId: string
    role: VolunteerRole
    volunteerId: string
}

export interface VolunteersStore {
    listVolunteers(): Promise<Volunteer[]>
    addVolunteer(name: string, email: string | null, roles: VolunteerRole[]): Promise<Volunteer>
    /**
     * Also clears their `year` shifts in any role they no longer hold, so the
     * roster can't show someone doing a job they've been taken off. Earlier
     * years are history and left alone.
     */
    setVolunteerRoles(volunteerId: string, roles: VolunteerRole[], year: string): Promise<void>
    /** Also removes every shift they were rostered into, in every year. */
    removeVolunteer(volunteerId: string): Promise<void>

    listAssignments(year: string): Promise<VolunteerAssignment[]>
    /**
     * Adds a volunteer to a seat alongside anyone already there. No-op if
     * they're already on it. Throws if they don't hold `role`, or if they're
     * somewhere *else* during `slotId` — a person can't be in two rooms, or
     * two roles, at once.
     */
    assign(year: string, assignment: VolunteerAssignment, assignedBy: string): Promise<void>
    /** No-op if they aren't on that seat. */
    unassign(year: string, assignment: VolunteerAssignment): Promise<void>
}

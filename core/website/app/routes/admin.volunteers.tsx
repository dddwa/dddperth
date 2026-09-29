import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { useEffect, useRef, useState } from 'react'
import { data, useFetcher, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { fieldLabelClass, inputClass } from '~/components/portal-form'
import { SpeakerModal } from '~/components/speaker-modal'
import { Button } from '~/components/ui/button'
import { VolunteerPlanner, type VolunteerRosterChange } from '~/components/volunteer-planner'
import { requireAdmin } from '~/lib/auth.server'
import { getScheduleForOrganisers } from '~/lib/published-agenda.server'
import { isVolunteerRole, VOLUNTEER_ROLES, type VolunteerRole } from '~/lib/services/volunteers-store'
import { useQueuedSave } from '~/lib/use-queued-save'
import { buildVolunteerRosterTable, type VolunteerRosterInput } from '~/lib/volunteer-roster-table'
import { getConferenceState, getServices } from '~/remix-app-load-context'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.volunteers'

/** "09:30:00" → "9:30 am". */
function formatTime(time: string) {
    return DateTime.fromFormat(time, 'HH:mm:ss').toFormat('h:mm a').toLowerCase()
}

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)
    const year = getConferenceState(context).conference.year

    const [schedule, volunteers, assignments] = await Promise.all([
        // Unpublished included: rosters get planned before the agenda goes public.
        getScheduleForOrganisers(context, year),
        services.volunteers.listVolunteers(),
        services.volunteers.listAssignments(year),
    ])

    const rooms = (schedule?.rooms ?? []).map((room) => ({ id: String(room.id), name: room.name }))

    // A plenum talk (a keynote) is held across the run sheets' plenum rooms
    // with the walls open, but Sessionize files it under the first of them
    // only — so it spans the run of plenum rooms from its own, as long as
    // they're free. Its shifts still belong to its own room.
    const { plenumLocations = [], sessionizeRoomLocations = {} } = conferenceManifest.runsheets ?? {}
    const isPlenumRoom = (index: number) =>
        plenumLocations.includes(sessionizeRoomLocations[rooms[index]?.name ?? ''] ?? '')
    const plenumColSpan = (roomId: string, busyRoomIds: string[]) => {
        const roomIndex = rooms.findIndex((room) => room.id === roomId)
        if (!isPlenumRoom(roomIndex)) return 1
        let span = 1
        while (isPlenumRoom(roomIndex + span) && !busyRoomIds.includes(rooms[roomIndex + span].id)) span++
        return span
    }

    // Every time slot is a calendar row, breaks included, so the day reads
    // top to bottom. Breaks and changeovers (service sessions) show but get
    // no seats. A session spans every slot that starts before it ends.
    const timeSlots = schedule?.timeSlots ?? []
    const slots = timeSlots.map((timeSlot, slotIndex) => ({
        id: timeSlot.slotStart,
        label: formatTime(timeSlot.slotStart),
        sessions: Object.fromEntries(
            timeSlot.rooms.map((room) => {
                // Sessionize times are local, e.g. "2026-11-14T09:30:00".
                const endsAt = room.session.endsAt?.slice(11, 19)
                const later = timeSlots.slice(slotIndex + 1)
                const rowSpan = 1 + (endsAt ? later.filter((slot) => slot.slotStart < endsAt).length : 0)
                const colSpan = room.session.isPlenumSession
                    ? plenumColSpan(
                          String(room.id),
                          timeSlot.rooms.map((other) => String(other.id)),
                      )
                    : 1
                return [
                    String(room.id),
                    {
                        title: room.session.title,
                        rowSpan,
                        colSpan,
                        isService: room.session.isServiceSession,
                        endLabel: endsAt ? formatTime(endsAt) : '',
                    },
                ]
            }),
        ),
    }))

    // Shifts rostered against a slot/room the agenda no longer has (a talk
    // moved or a room was renumbered in Sessionize). They're kept, not
    // deleted, but can't be shown in the grid — so say how many there are.
    const liveSeats = new Set(
        slots.flatMap((slot) =>
            Object.entries(slot.sessions)
                .filter(([, session]) => !session.isService)
                .map(([roomId]) => `${slot.id}|${roomId}`),
        ),
    )
    const orphanedCount = assignments.filter((a) => !liveSeats.has(`${a.slotId}|${a.roomId}`)).length

    const shiftCount = new Map<string, number>()
    for (const a of assignments) shiftCount.set(a.volunteerId, (shiftCount.get(a.volunteerId) ?? 0) + 1)

    return data({
        year,
        rooms,
        slots,
        assignments,
        orphanedCount,
        volunteers: volunteers.map((volunteer) => ({ ...volunteer, shifts: shiftCount.get(volunteer.id) ?? 0 })),
    })
}

export async function action({ request, context }: Route.ActionArgs) {
    const { email } = await requireAdmin(request, context)
    const services = getServices(context)
    const year = getConferenceState(context).conference.year

    const formData = await request.formData()
    const str = (key: string) => {
        const value = formData.get(key)
        return typeof value === 'string' ? value.trim() : ''
    }
    const intent = str('intent')

    try {
        switch (intent) {
            case 'add_volunteer': {
                const name = str('name')
                if (!name) return { success: false as const, error: 'A volunteer needs a name.' }
                const roles = formData
                    .getAll('roles')
                    .filter((role): role is VolunteerRole => typeof role === 'string' && isVolunteerRole(role))
                await services.volunteers.addVolunteer(name, str('email') || null, roles)
                break
            }

            case 'set_volunteer_roles':
                await services.volunteers.setVolunteerRoles(
                    str('volunteerId'),
                    str('roles').split(',').filter(isVolunteerRole),
                    year,
                )
                break

            case 'remove_volunteer':
                await services.volunteers.removeVolunteer(str('volunteerId'))
                break

            case 'assign':
            case 'unassign': {
                const role = str('role')
                if (!isVolunteerRole(role)) return { success: false as const, error: `Unknown role: ${role}` }
                const assignment = { slotId: str('slotId'), roomId: str('roomId'), role, volunteerId: str('volunteerId') }
                if (intent === 'assign') {
                    await services.volunteers.assign(year, assignment, email)
                } else {
                    await services.volunteers.unassign(year, assignment)
                }
                break
            }

            default:
                return { success: false as const, error: `Unknown intent: ${intent}` }
        }

        return { success: true as const }
    } catch (error: any) {
        console.error('Volunteer roster action failed:', error)
        return { success: false as const, error: error?.message ?? 'Failed to save' }
    }
}

type VolunteersPageChange =
    | VolunteerRosterChange
    | { intent: 'set_volunteer_roles'; volunteerId: string; roles: string }
    | { intent: 'remove_volunteer'; volunteerId: string }

// css() rather than spread props objects, so Panda's static extraction sees them.
const volunteerListClass = css({
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))',
    gap: '2',
})
const checkboxRowClass = css({ display: 'flex', flexWrap: 'wrap', gap: '3', fontSize: 'sm' })

export default function AdminVolunteers() {
    const { year, rooms, slots, assignments, orphanedCount, volunteers } = useLoaderData<typeof loader>()
    const { save, saveError } = useQueuedSave<VolunteersPageChange>('volunteer roster', '/admin/volunteers/save')

    const addFetcher = useFetcher<typeof action>()
    const addForm = useRef<HTMLFormElement>(null)
    useEffect(() => {
        if (addFetcher.state === 'idle' && addFetcher.data?.success) addForm.current?.reset()
    }, [addFetcher.state, addFetcher.data])

    const error = saveError ?? (addFetcher.data?.success === false ? addFetcher.data.error : null)

    function toggleRole(volunteer: (typeof volunteers)[number], role: VolunteerRole, checked: boolean) {
        if (!checked) {
            const shifts = assignments.filter((a) => a.volunteerId === volunteer.id && a.role === role).length
            const label = VOLUNTEER_ROLES.find((r) => r.id === role)?.label.toLowerCase()
            if (shifts && !confirm(`Take ${volunteer.name} off ${label}? They'll be taken off the ${shifts} ${shifts === 1 ? 'talk' : 'talks'} they're rostered for as a ${label}.`)) {
                return false
            }
        }
        const roles = checked ? [...volunteer.roles, role] : volunteer.roles.filter((r) => r !== role)
        save({ intent: 'set_volunteer_roles', volunteerId: volunteer.id, roles: roles.join(',') })
        return true
    }

    function remove(volunteer: (typeof volunteers)[number]) {
        const warning = volunteer.shifts
            ? ` They'll be taken off the ${volunteer.shifts} ${volunteer.shifts === 1 ? 'talk' : 'talks'} they're rostered for.`
            : ''
        if (confirm(`Remove ${volunteer.name}?${warning}`)) save({ intent: 'remove_volunteer', volunteerId: volunteer.id })
    }

    return (
        <AdminLayout heading={`Volunteers — ${year}`} fullWidth>
            {error && (
                <Box role="alert" mb="4" p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                    {error}
                </Box>
            )}

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                    Volunteers ({volunteers.length})
                </styled.h2>
                <addFetcher.Form method="post" ref={addForm}>
                    <input type="hidden" name="intent" value="add_volunteer" />
                    <Flex gap="3" alignItems="flex-end" flexWrap="wrap" mb="4">
                        <label className={fieldLabelClass}>
                            Name
                            <input className={inputClass} name="name" required />
                        </label>
                        <label className={fieldLabelClass}>
                            Email (optional)
                            <input className={inputClass} name="email" type="email" />
                        </label>
                        <fieldset>
                            <legend className={fieldLabelClass}>Roles</legend>
                            <div className={checkboxRowClass}>
                                {VOLUNTEER_ROLES.map((role) => (
                                    <label key={role.id}>
                                        <input type="checkbox" name="roles" value={role.id} /> {role.label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <Button type="submit" size="sm" disabled={addFetcher.state !== 'idle'}>
                            Add volunteer
                        </Button>
                    </Flex>
                </addFetcher.Form>

                {volunteers.length === 0 ? (
                    <styled.p fontSize="sm" color="admin.600">
                        No volunteers yet — add some above to start rostering.
                    </styled.p>
                ) : (
                    <ul className={volunteerListClass}>
                        {volunteers.map((volunteer) => (
                            <styled.li
                                key={volunteer.id}
                                display="flex"
                                flexWrap="wrap"
                                alignItems="center"
                                gap="2"
                                p="2"
                                border="admin-subtle"
                                borderRadius="md"
                                fontSize="sm"
                            >
                                <Box flex="1" minW="0">
                                    <styled.p fontWeight="medium">{volunteer.name}</styled.p>
                                    {volunteer.email && (
                                        <styled.p fontSize="xs" color="admin.600" overflowWrap="anywhere">
                                            {volunteer.email}
                                        </styled.p>
                                    )}
                                </Box>
                                <styled.span
                                    px="2"
                                    py="0.5"
                                    borderRadius="full"
                                    fontSize="xs"
                                    fontWeight="bold"
                                    bg={volunteer.shifts === 0 ? 'status.danger.bg' : 'status.success.bg'}
                                    color={volunteer.shifts === 0 ? 'status.danger.fg' : 'status.success.fg'}
                                >
                                    {volunteer.shifts} {volunteer.shifts === 1 ? 'talk' : 'talks'}
                                </styled.span>
                                <styled.button
                                    type="button"
                                    onClick={() => remove(volunteer)}
                                    cursor="pointer"
                                    color="admin.600"
                                    px="1"
                                    _hover={{ color: 'status.danger.fg' }}
                                >
                                    <span aria-hidden="true">×</span>
                                    <styled.span srOnly>Remove {volunteer.name}</styled.span>
                                </styled.button>
                                <styled.fieldset flexBasis="full">
                                    <styled.legend srOnly>Roles for {volunteer.name}</styled.legend>
                                    {/* Keyed on the saved roles so a refused save snaps the boxes back. */}
                                    <div className={checkboxRowClass} key={volunteer.roles.join()}>
                                        {VOLUNTEER_ROLES.map((role) => (
                                            <label key={role.id}>
                                                <input
                                                    type="checkbox"
                                                    defaultChecked={volunteer.roles.includes(role.id)}
                                                    onChange={(e) => {
                                                        if (!toggleRole(volunteer, role.id, e.target.checked)) {
                                                            e.target.checked = !e.target.checked
                                                        }
                                                    }}
                                                />{' '}
                                                {role.label}
                                            </label>
                                        ))}
                                    </div>
                                </styled.fieldset>
                            </styled.li>
                        ))}
                    </ul>
                )}
            </AdminCard>

            <AdminCard>
                <Flex justify="space-between" align="center" gap="4" flexWrap="wrap" mb="2">
                    <styled.h2 fontSize="xl" fontWeight="semibold">
                        Room coordinators &amp; photographers
                    </styled.h2>
                    {slots.length > 0 && (
                        <Flex gap="2" flexWrap="wrap">
                            {VOLUNTEER_ROLES.map((role) => (
                                <CopyRosterButton
                                    key={role.id}
                                    role={role}
                                    roster={{ rooms, slots, volunteers, assignments }}
                                />
                            ))}
                        </Flex>
                    )}
                </Flex>
                <styled.p fontSize="sm" color="admin.600" mb="4">
                    Time slots and rooms come from the {year} agenda in Sessionize, including before it&apos;s
                    published. Changes save as you make them. Several people can share a role in a room; volunteers
                    only drop into roles they&apos;re down for, and not into a time slot they&apos;re already rostered
                    in.
                </styled.p>
                {orphanedCount > 0 && (
                    <styled.p fontSize="sm" color="status.warning.fg" bg="status.warning.bg" p="3" borderRadius="md" mb="4">
                        {orphanedCount} rostered {orphanedCount === 1 ? 'shift is' : 'shifts are'} for a time slot or
                        room that&apos;s no longer on the agenda, so {orphanedCount === 1 ? "it isn't" : "they aren't"}{' '}
                        shown below.
                        {/* TODO: list them so they can be cleared or moved, if the agenda shifts after rostering. */}
                    </styled.p>
                )}
                {slots.length === 0 ? (
                    <styled.p fontSize="sm" color="admin.600">
                        There&apos;s no {year} agenda in Sessionize yet, so there&apos;s nothing to roster against.
                    </styled.p>
                ) : (
                    <VolunteerPlanner
                        rooms={rooms}
                        slots={slots}
                        volunteers={volunteers}
                        assignments={assignments}
                        onChange={save}
                    />
                )}
            </AdminCard>
        </AdminLayout>
    )
}

/** Opens one role's roster table in a modal, built from the grid as it
 * stands so it reflects the latest drag without a round trip. Copy puts it on
 * the clipboard as HTML, so it pastes into Gmail/Outlook as a real table; the
 * preview can also be selected and copied by hand if the clipboard's refused. */
function CopyRosterButton({ role, roster }: { role: (typeof VOLUNTEER_ROLES)[number]; roster: VolunteerRosterInput }) {
    const [open, setOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const table = open ? buildVolunteerRosterTable(roster, role.id) : null

    const copy = async () => {
        if (!table) return
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([table.html], { type: 'text/html' }),
                    'text/plain': new Blob([table.text], { type: 'text/plain' }),
                }),
            ])
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard refused — the preview can still be selected and copied.
        }
    }

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="outline"
                color="admin.900"
                borderColor="admin.400"
                bg="white"
                _hover={{ bg: 'admin.100' }}
                onClick={() => setOpen(true)}
            >
                Copy {role.label.toLowerCase()} roster
            </Button>
            <SpeakerModal title={`${role.label} roster`} open={open} onOpenChange={setOpen} wide>
                {table && (
                    <Flex direction="column" alignItems="flex-start" gap="3">
                        <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            color="admin.900"
                            borderColor="admin.400"
                            bg="white"
                            _hover={{ bg: 'admin.100' }}
                            onClick={() => void copy()}
                        >
                            {copied ? 'Copied' : 'Copy formatted'}
                        </Button>
                        <styled.span role="status" srOnly>
                            {copied ? `${role.label} roster copied` : ''}
                        </styled.span>
                        <Box
                            maxW="full"
                            fontSize="sm"
                            overflowX="auto"
                            // Escaped by buildVolunteerRosterTable; this is the
                            // exact HTML the copy button puts on the clipboard.
                            dangerouslySetInnerHTML={{ __html: table.html }}
                        />
                    </Flex>
                )}
            </SpeakerModal>
        </>
    )
}

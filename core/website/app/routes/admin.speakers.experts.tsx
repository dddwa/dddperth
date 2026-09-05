import { conferenceManifest } from '@conference/manifest'
import { useCallback, useEffect, useRef, useState } from 'react'
import { data, useLoaderData, useRevalidator } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { MeetTheExpertsPlanner, type MeetTheExpertsChange } from '~/components/meet-the-experts-planner'
import { requireAdmin } from '~/lib/auth.server'
import { getServices } from '~/remix-app-load-context'
import { Box, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.speakers.experts'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const slots = conferenceManifest.meetTheExperts?.slots ?? []
    const speakerYear = conferenceManifest.speakerPortal?.year
    const sponsorYear = conferenceManifest.sponsorPortal?.year

    const [speakers, sponsors, registrations, schedulingState] = await Promise.all([
        speakerYear ? services.speakers.listSpeakers(speakerYear) : Promise.resolve([]),
        sponsorYear ? services.sponsors.listSponsors(sponsorYear) : Promise.resolve([]),
        services.meetTheExperts.listRegistrations(),
        services.meetTheExpertsScheduling.getState(),
    ])

    const displayNameByKey = new Map<string, string>()
    for (const speaker of speakers) displayNameByKey.set(`speaker:${speaker.sessionizeId}`, speaker.fullName)
    for (const sponsor of sponsors) displayNameByKey.set(`sponsor:${sponsor.issueKey}`, sponsor.companyName)

    const assignedCountByRegistrant = new Map<string, number>()
    for (const assignment of schedulingState.assignments) {
        const key = `${assignment.registrantType}:${assignment.registrantId}`
        assignedCountByRegistrant.set(key, (assignedCountByRegistrant.get(key) ?? 0) + 1)
    }

    const registrants = registrations
        .filter((registration) => registration.slots.length > 0)
        .map((registration) => {
            const key = `${registration.registrantType}:${registration.registrantId}`
            return {
                registrantType: registration.registrantType,
                registrantId: registration.registrantId,
                displayName: displayNameByKey.get(key) ?? registration.registrantId,
                slots: registration.slots,
                assignedCount: assignedCountByRegistrant.get(key) ?? 0,
            }
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName))

    const assignments = schedulingState.assignments.map((assignment) => ({
        ...assignment,
        displayName:
            displayNameByKey.get(`${assignment.registrantType}:${assignment.registrantId}`) ??
            assignment.registrantId,
    }))

    // Registered but said none of the configured slots work for them —
    // a deliberate, complete answer, so they're excluded from the draggable
    // pool rather than shown unschedulable.
    const optedOutCount = registrations.filter((registration) => registration.slots.length === 0).length

    return data({
        slots,
        tables: schedulingState.tables,
        assignments,
        registrants,
        optedOutCount,
    })
}

export async function action({ request, context }: Route.ActionArgs) {
    const { email } = await requireAdmin(request, context)
    const services = getServices(context)

    const formData = await request.formData()
    const str = (key: string) => {
        const value = formData.get(key)
        return typeof value === 'string' ? value : ''
    }
    const intent = str('intent')

    try {
        switch (intent) {
            case 'add_table':
                await services.meetTheExpertsScheduling.addTable(str('label') || 'New table')
                break

            case 'rename_table':
                await services.meetTheExpertsScheduling.renameTable(str('tableId'), str('label'))
                break

            case 'remove_table':
                await services.meetTheExpertsScheduling.removeTable(str('tableId'))
                break

            case 'move_table':
                await services.meetTheExpertsScheduling.moveTable(
                    str('tableId'),
                    str('direction') === 'up' ? 'up' : 'down',
                )
                break

            case 'assign': {
                const registrantType = str('registrantType')
                if (registrantType !== 'speaker' && registrantType !== 'sponsor') {
                    return { success: false as const, error: `Unknown registrant type: ${registrantType}` }
                }
                await services.meetTheExpertsScheduling.assign(
                    str('tableId'),
                    str('slotId'),
                    { type: registrantType, id: str('registrantId') },
                    email,
                )
                break
            }

            case 'unassign':
                await services.meetTheExpertsScheduling.unassign(str('tableId'), str('slotId'))
                break

            default:
                return { success: false as const, error: `Unknown intent: ${intent}` }
        }

        return { success: true as const }
    } catch (error: any) {
        console.error('Meet the Experts scheduling action failed:', error)
        return { success: false as const, error: error?.message ?? 'Failed to save' }
    }
}

export default function AdminSpeakersExperts() {
    const { slots, tables, assignments, registrants, optedOutCount } = useLoaderData<typeof loader>()
    const revalidator = useRevalidator()

    // Same queued-fetch-then-revalidate pattern as the agenda planner
    // (admin.voting_.agenda.$runId.tsx): a fetcher would abort an in-flight
    // submit when a second drag lands close behind it, so writes are chained
    // through a manual promise queue instead.
    const queue = useRef<Promise<unknown>>(Promise.resolve())
    const [inFlight, setInFlight] = useState(0)
    const [saveError, setSaveError] = useState<string | null>(null)

    const save = useCallback((change: MeetTheExpertsChange) => {
        setInFlight((n) => n + 1)
        queue.current = queue.current
            .then(async () => {
                const response = await fetch(window.location.pathname, {
                    method: 'POST',
                    body: new URLSearchParams(change),
                })
                if (!response.ok) {
                    throw new Error(`Save failed (${response.status})`)
                }
                const result: { success: boolean; error?: string } = await response.json()
                if (!result.success) {
                    throw new Error(result.error ?? 'Save failed')
                }
                setSaveError(null)
            })
            .catch((error: unknown) => {
                console.error('Failed to save Meet the Experts scheduling:', error)
                setSaveError(error instanceof Error ? error.message : 'Failed to save')
            })
            .finally(() => setInFlight((n) => n - 1))
    }, [])

    const isSaving = inFlight > 0

    useEffect(() => {
        if (!isSaving && revalidator.state === 'idle') {
            void revalidator.revalidate()
        }
    }, [isSaving, revalidator])

    return (
        <AdminLayout heading="Meet the Experts — seating" fullWidth>
            {optedOutCount > 0 && (
                <AdminCard>
                    <styled.p fontSize="sm" color="admin.700">
                        {optedOutCount} {optedOutCount === 1 ? 'person has' : 'people have'} registered for Meet the
                        Experts but said none of the slots work for them, so they aren't listed below.
                    </styled.p>
                </AdminCard>
            )}

            {saveError && (
                <Box mb="4" p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                    {saveError}
                </Box>
            )}

            <AdminCard>
                <MeetTheExpertsPlanner
                    slots={slots}
                    tables={tables}
                    assignments={assignments}
                    registrants={registrants}
                    onChange={save}
                />
            </AdminCard>
        </AdminLayout>
    )
}

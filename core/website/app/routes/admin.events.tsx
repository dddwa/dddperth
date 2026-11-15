import { data, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import { eventStatus, formatEventWhen } from '~/lib/events/event-form'
import { getDateTimeProvider, getServices } from '~/remix-app-load-context'
import { Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.events'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const now = getDateTimeProvider(context).nowDate()
    const events = await getServices(context).events.list()

    return data({
        events: events.map((event) => ({
            id: event.id,
            slug: event.slug,
            title: event.title,
            when: formatEventWhen(event),
            location: event.location,
            status: eventStatus(event, now),
        })),
    })
}

const cell = { p: '2', border: 'admin-emphasis', verticalAlign: 'top' } as const
const STATUS_LABEL = { draft: 'Draft (hidden)', upcoming: 'On the home page', past: 'Finished' } as const

export default function EventsAdmin() {
    const { events } = useLoaderData<typeof loader>()

    return (
        <AdminLayout heading="Events">
            <AdminCard>
                <Flex gap="4" flexWrap="wrap" alignItems="baseline" justifyContent="space-between" mb="4">
                    <styled.p fontSize="sm" color="admin.600" maxW="prose">
                        Smaller events — meetups, socials, info nights. Published events show on the home page until
                        they finish, soonest first, and each has its own page with the full description.
                    </styled.p>
                    <AppLink
                        to="/admin/events/new"
                        unstyled
                        px="4"
                        py="2"
                        rounded="md"
                        bg="indigo.9"
                        color="white"
                        fontWeight="medium"
                        fontSize="sm"
                        _hover={{ bg: 'indigo.10' }}
                    >
                        New event
                    </AppLink>
                </Flex>

                {events.length ? (
                    <styled.table width="full" fontSize="sm">
                        <thead>
                            <tr>
                                <styled.th {...cell} textAlign="left">
                                    Event
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    When
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Where
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Status
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Page
                                </styled.th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((event) => (
                                <tr key={event.id}>
                                    <styled.td {...cell}>
                                        <AppLink to={`/admin/events/${event.id}`} unstyled textDecoration="underline">
                                            {event.title}
                                        </AppLink>
                                    </styled.td>
                                    <styled.td {...cell}>{event.when}</styled.td>
                                    <styled.td {...cell}>{event.location}</styled.td>
                                    <styled.td {...cell}>{STATUS_LABEL[event.status]}</styled.td>
                                    <styled.td {...cell}>
                                        {event.status === 'draft' ? (
                                            '—'
                                        ) : (
                                            <AppLink to={`/events/${event.slug}`} unstyled textDecoration="underline">
                                                /events/{event.slug}
                                            </AppLink>
                                        )}
                                    </styled.td>
                                </tr>
                            ))}
                        </tbody>
                    </styled.table>
                ) : (
                    <p>No events yet.</p>
                )}
            </AdminCard>
        </AdminLayout>
    )
}

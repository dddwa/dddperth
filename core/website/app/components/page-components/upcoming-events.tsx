import { AppLink } from '~/components/app-link'
import { Flex, styled } from '~/styled-system/jsx'

/** Already formatted on the server, so the browser's timezone can't shift it. */
export interface UpcomingEventView {
    id: string
    slug: string
    title: string
    when: string
    location: string | null
    locationUrl: string | null
}

const linkStyle = {
    color: 'text.highlight',
    textDecoration: 'underline',
    textUnderlineOffset: '4px',
    _hover: { color: 'brand.primary' },
} as const

/**
 * The home page's list of smaller events (meetups, socials...) created at
 * /admin/events. Just the essentials; the description lives on each event's
 * own page. Renders nothing when there are none, so the page reads the same
 * as before for a conference that never uses it.
 */
export function UpcomingEvents({ events }: { events: UpcomingEventView[] }) {
    if (events.length === 0) return null

    return (
        <Flex flexDirection="column" gap="2">
            <styled.h2 fontSize={{ base: 'lg', md: '3xl' }} color="text.primary" fontWeight="semibold" width="fit">
                Upcoming Events
            </styled.h2>
            <styled.ul display="flex" flexDirection="column" gap="4" listStyle="none">
                {events.map((event) => (
                    <styled.li
                        key={event.id}
                        display="flex"
                        flexDirection="column"
                        gap="2"
                        rounded="lg"
                        color="text.primary"
                        shadow="sm"
                        bgGradient="to-r"
                        gradientFrom="overlay.active-row-start"
                        gradientTo="overlay.active-row-end"
                        borderTop="emphasis"
                        p="4"
                    >
                        <styled.h3 fontSize={{ base: 'md', md: 'xl' }} fontWeight="semibold">
                            {event.title}
                        </styled.h3>
                        <styled.p fontSize="sm" fontWeight="medium" color="text.secondary">
                            {event.when}
                            {event.location ? (
                                <>
                                    {' · '}
                                    {event.locationUrl ? (
                                        <AppLink to={event.locationUrl} unstyled {...linkStyle}>
                                            {event.location}
                                        </AppLink>
                                    ) : (
                                        event.location
                                    )}
                                </>
                            ) : null}
                        </styled.p>
                        <styled.p>
                            {/* Names the event, so a screen reader's links list isn't a column of "Event details". */}
                            <AppLink to={`/events/${event.slug}`} unstyled fontWeight="semibold" {...linkStyle}>
                                Event details<styled.span srOnly>: {event.title}</styled.span> →
                            </AppLink>
                        </styled.p>
                    </styled.li>
                ))}
            </styled.ul>
        </Flex>
    )
}

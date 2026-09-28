import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { useMemo, useState } from 'react'
import { data, useLoaderData } from 'react-router'
import { $path } from 'safe-routes'
import { AppLink } from '~/components/app-link'
import { PageLayout } from '~/components/page-layout'
import { Button } from '~/components/ui/button'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { AgendaTalk } from '~/lib/my-agenda'
import { getPublishedSchedule, scheduleTalks } from '~/lib/published-agenda.server'
import { noIndexMeta } from '~/lib/seo'
import { useHydrated, useMyAgenda } from '~/lib/use-my-agenda'
import { getConferenceState } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.agenda.my'

/**
 * A person's own agenda: the talks they picked on `/agenda`, in time order.
 *
 * The picks live in this browser's localStorage, so the server sends the whole
 * published agenda and the page filters it. That also means the page is the
 * same for everyone and caches like the agenda does.
 */
export async function loader({ context }: Route.LoaderArgs) {
    const year = getConferenceState(context).conference.year
    const schedule = await getPublishedSchedule(context, year)
    const timeOf = (iso: string) =>
        DateTime.fromISO(iso, { zone: conferenceManifest.public.timezone }).toFormat('h:mm a').toLowerCase()

    const talks = schedule
        ? scheduleTalks(schedule).flatMap((talk) =>
              talk.startsAt && talk.endsAt
                  ? [
                        {
                            id: talk.id,
                            title: talk.title,
                            startsAt: talk.startsAt,
                            endsAt: talk.endsAt,
                            timeRange: `${timeOf(talk.startsAt)} - ${timeOf(talk.endsAt)}`,
                            room: talk.room,
                            speakers: talk.speakers.map((speaker) => speaker.name).join(', '),
                        },
                    ]
                  : [],
          )
        : []

    return data({ year, published: !!schedule, talks }, { headers: { 'Cache-Control': CACHE_CONTROL.schedule } })
}

// Personal, and empty to a crawler anyway: the picks are client-side.
export const meta = () => [...noIndexMeta(), { title: `My agenda | ${conferenceManifest.public.name}` }]

export default function MyAgenda() {
    const { year, published, talks } = useLoaderData<typeof loader>()
    const hydrated = useHydrated()

    const talksById = useMemo(() => new Map(talks.map((talk) => [talk.id, talk])), [talks])
    const pickableById = useMemo(
        () => new Map<string, AgendaTalk>(talks.map(({ id, startsAt, endsAt }) => [id, { id, startsAt, endsAt }])),
        [talks],
    )
    const { picked, toggle, forget } = useMyAgenda(year, pickableById)
    const [announcement, setAnnouncement] = useState('')

    const pickedTalks = picked
        .flatMap((id) => {
            const talk = talksById.get(id)
            return talk ? [talk] : []
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    const stale = picked.filter((id) => !talksById.has(id))

    const agendaLink = $path('/agenda/:year?', { year: undefined })

    return (
        <PageLayout>
            <Box maxWidth="[800px]" mx="auto" p="4" color="text.secondary">
                <styled.h1 fontSize="3xl" fontWeight="semibold" color="text.primary" mb="2">
                    My agenda
                </styled.h1>
                <styled.div srOnly aria-live="polite" role="status">
                    {announcement}
                </styled.div>

                {!published ? (
                    <p>
                        The {conferenceManifest.public.name} {year} agenda hasn&apos;t been announced yet. Once it is,
                        you can pick talks from it to build your day.
                    </p>
                ) : !hydrated ? (
                    <p>Loading your picks…</p>
                ) : (
                    <>
                        <styled.p mb="4">
                            Talks you&apos;ve picked for {conferenceManifest.public.name} {year}. They&apos;re saved in
                            this browser only, so picks made on another device won&apos;t show here.
                        </styled.p>

                        {pickedTalks.length === 0 ? (
                            <p>
                                You haven&apos;t picked any talks yet.{' '}
                                <AppLink to={agendaLink} unstyled color="text.highlight" textDecoration="underline">
                                    Browse the agenda
                                </AppLink>{' '}
                                and use the + button on a talk to add it.
                            </p>
                        ) : (
                            <>
                                <Flex gap="4" flexWrap="wrap" alignItems="center" mb="6">
                                    <AppLink
                                        to={`/agenda/my.ics?talks=${pickedTalks.map((talk) => talk.id).join(',')}`}
                                        download
                                        unstyled
                                        color="text.highlight"
                                        textDecoration="underline"
                                    >
                                        Add to calendar (.ics)
                                    </AppLink>
                                    <AppLink to={agendaLink} unstyled color="text.highlight" textDecoration="underline">
                                        Back to the agenda
                                    </AppLink>
                                </Flex>

                                <styled.ol display="flex" flexDirection="column" gap="3">
                                    {pickedTalks.map((talk) => (
                                        <styled.li
                                            key={talk.id}
                                            rounded="sm"
                                            bgColor="surface.card"
                                            p="3"
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="flex-start"
                                            gap="3"
                                        >
                                            <Box>
                                                <styled.p fontSize="sm" fontWeight="semibold">
                                                    {talk.timeRange}
                                                </styled.p>
                                                <styled.h2
                                                    fontSize="md"
                                                    fontWeight="semibold"
                                                    color="text.primary"
                                                    lineHeight="tight"
                                                >
                                                    <AppLink
                                                        to={$path('/agenda/:year/talk/:sessionId', {
                                                            year,
                                                            sessionId: talk.id,
                                                        })}
                                                        unstyled
                                                        color="text.primary"
                                                        _hover={{ color: 'text.highlight' }}
                                                    >
                                                        {talk.title}
                                                    </AppLink>
                                                </styled.h2>
                                                <styled.p fontSize="sm">
                                                    {[talk.room, talk.speakers].filter(Boolean).join(' · ')}
                                                </styled.p>
                                            </Box>
                                            <Button
                                                size="xs"
                                                colorPalette="brand.primary"
                                                variant="outline"
                                                onClick={() => {
                                                    toggle(pickableById.get(talk.id) as AgendaTalk)
                                                    setAnnouncement(`Removed ${talk.title} from your agenda.`)
                                                }}
                                                aria-label={`Remove ${talk.title} from my agenda`}
                                            >
                                                Remove
                                            </Button>
                                        </styled.li>
                                    ))}
                                </styled.ol>
                            </>
                        )}

                        {stale.length > 0 ? (
                            <Flex mt="6" gap="3" alignItems="center" flexWrap="wrap">
                                <p>
                                    {stale.length === 1
                                        ? '1 talk you picked is no longer on the agenda.'
                                        : `${stale.length} talks you picked are no longer on the agenda.`}
                                </p>
                                <Button
                                    size="xs"
                                    colorPalette="brand.primary"
                                    variant="outline"
                                    onClick={() => {
                                        forget(stale)
                                        setAnnouncement('Cleared talks that are no longer on the agenda.')
                                    }}
                                >
                                    Clear them
                                </Button>
                            </Flex>
                        ) : null}
                    </>
                )}
            </Box>
        </PageLayout>
    )
}

import { DateTime } from 'luxon'
import { data, redirect, useLoaderData } from 'react-router'
import { $path } from 'safe-routes'
import type { TypeOf } from 'zod'
import { AppLink } from '~/components/app-link'
import { SponsorSection } from '~/components/page-components/SponsorSection'
import { SponsorLogo } from '~/components/sponsor-logo'
import { conferenceConfigPublic } from '@ddd/conference-config/public'
import { conferenceConfig } from '@ddd/conference-config'
import type { Year, YearSponsors } from '~/lib/conference-state-client-safe'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { gridRoomSchema, speakersSchema } from '~/lib/sessionize.server'
import { getConfSessions, getConfSpeakers } from '~/lib/sessionize.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.agenda.$year.talk.$sessionId'

export async function loader({ params: { year, sessionId }, context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(year, context.config)

    if (yearConfig.kind === 'cancelled') {
        return redirect($path('/agenda/:year?', { year: undefined }))
    }

    const now = context.dateTimeProvider.nowDate()
    const agendaPublished =
        (yearConfig.agendaPublishedDateTime ? now >= yearConfig.agendaPublishedDateTime : false) ||
        (!!yearConfig.conferenceDate && now >= yearConfig.conferenceDate)

    let session: TypeOf<typeof gridRoomSchema>['sessions'][number] | undefined

    if (yearConfig.sessions?.kind === 'sessionize' && yearConfig.sessions.sessionizeEndpoint && agendaPublished) {
        const sessions = await getConfSessions({
            sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
        })
        session = sessions.find((s) => s.id === sessionId)
    } else if (yearConfig.sessions?.kind === 'session-data') {
        const day = yearConfig.sessions.sessions[0]
        session = day?.rooms.flatMap((room) => room.sessions).find((s) => s.id === sessionId)
    }

    if (!session) {
        throw new Response(JSON.stringify({ message: 'No session found' }), { status: 404 })
    }

    const speakers: TypeOf<typeof speakersSchema> =
        yearConfig.sessions?.kind === 'sessionize' && yearConfig.sessions.sessionizeEndpoint && agendaPublished
            ? await getConfSpeakers({
                  sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
              })
            : []
    const talkSpeakers = session.speakers
        .map((speakerId) => speakers.find((speaker) => speaker.id === speakerId.id))
        .filter((speaker): speaker is TypeOf<typeof speakersSchema>[number] => !!speaker)

    return data(
        {
            year: year as Year,
            sponsors: yearConfig.sponsors,
            conferences: Object.values(conferenceConfig.conferences).map((conf) => ({
                year: conf.year,
            })),
            session,
            talkSpeakers,
            sessionStart: session.startsAt
                ? DateTime.fromISO(session.startsAt, { zone: conferenceConfigPublic.timezone }).toLocaleString(
                      DateTime.TIME_SIMPLE,
                      { locale: 'en-AU' },
                  )
                : null,
            sessionEnd: session.endsAt
                ? DateTime.fromISO(session.endsAt, { zone: conferenceConfigPublic.timezone }).toLocaleString(
                      DateTime.TIME_SIMPLE,
                      { locale: 'en-AU' },
                  )
                : null,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.schedule } },
    )
}

export default function Agenda() {
    const { session, sponsors, conferences, year, sessionStart, sessionEnd, talkSpeakers } =
        useLoaderData<typeof loader>()

    return (
        <Flex
            flexDirection="column"
            alignContent="center"
            bgGradient="to-b"
            gradientFrom="surface.hero"
            gradientToPosition="99%"
            gradientTo="surface.body"
            mx="auto"
            p="4"
        >
            <Box maxWidth="[1200px]" color="text.secondary" mx="auto" p="1" fontSize="sm">
                <AppLink to={$path(`/agenda/:year?`, { year })} mb="5" display="block" textDecoration="underline">
                    Back to {year} Agenda
                </AppLink>
                <styled.h2 fontSize="lg" pb="3">
                    {session.title}
                </styled.h2>
                <styled.span
                    display="none"
                    md={{
                        display: 'block',
                    }}
                    color="text.secondary"
                    textWrap="nowrap"
                    pb="3"
                >
                    🕓 {sessionStart} - {sessionEnd}
                </styled.span>
                <styled.span display="block" color="text.secondary" textOverflow="ellipsis" textWrap="nowrap" pb="3">
                    📍 {session.room}
                </styled.span>
                <RoomSponsorBadge sponsors={sponsors} roomName={session.room} />
                <styled.div>{session.description}</styled.div>
                {session?.speakers?.length ? (
                    <styled.div display="block" color="text.secondary">
                        {talkSpeakers.map((speaker) => (
                            <styled.div key={speaker.id} display="flex" alignItems="center">
                                {speaker.profilePicture ? (
                                    <styled.img
                                        src={speaker.profilePicture}
                                        alt={speaker.fullName}
                                        width="[120px]"
                                        height="[120px]"
                                        borderRightRadius="[50%]"
                                        mr="2"
                                    />
                                ) : null}
                                {speaker.fullName}
                            </styled.div>
                        ))}
                    </styled.div>
                ) : null}
                <SponsorSection sponsors={sponsors} year={year} />
                <ConferenceBrowser conferences={conferences} />
            </Box>
        </Flex>
    )
}

function RoomSponsorBadge({ sponsors, roomName }: { sponsors: YearSponsors; roomName: string | null }) {
    const roomSponsor = sponsors.room?.find((r) => r.roomName === roomName)
    if (!roomSponsor) return null

    return (
        <Flex alignItems="center" gap="2" color="text.secondary" fontSize="sm" pb="3">
            <styled.span>Room sponsored by</styled.span>
            <styled.a
                href={roomSponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                display="inline-flex"
                alignItems="center"
            >
                <SponsorLogo
                    logoUrlDarkMode={roomSponsor.logoUrlDarkMode}
                    logoUrlLightMode={roomSponsor.logoUrlLightMode}
                    name={roomSponsor.name}
                    maxHeight="[40px]"
                    maxWidth="[140px]"
                    objectFit="contain"
                />
            </styled.a>
        </Flex>
    )
}

function ConferenceBrowser({ conferences }: { conferences: { year: Year }[] }) {
    return (
        <styled.div padding="4" color="text.primary">
            <styled.h2 fontSize="xl" marginBottom="2">
                Other Conferences
            </styled.h2>
            <styled.div display="flex" flexWrap="wrap" justifyContent="space-around" gap="4">
                {conferences.map((conf) => (
                    <styled.a key={conf.year} href={`/agenda/${conf.year}`}>
                        <styled.span fontSize="lg">{conf.year}</styled.span>
                    </styled.a>
                ))}
            </styled.div>
        </styled.div>
    )
}

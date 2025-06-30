import { DateTime } from 'luxon'
import { data, redirect, useLoaderData } from 'react-router'
import { $path } from 'safe-routes'
import type { TypeOf } from 'zod'
import { AppLink } from '~/components/app-link'
import { SponsorSection } from '~/components/page-components/SponsorSection'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { conferenceConfig } from '~/config/conference-config.server'
import type { Year } from '~/lib/conference-state-client-safe'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { sessionsSchema, speakersSchema } from '~/lib/sessionize.server'
import { getConfSessions, getConfSpeakers } from '~/lib/sessionize.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.agenda.$year.talk.$sessionId'

export async function loader({ params: { year, sessionId } }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(year)

    if (yearConfig.kind === 'cancelled') {
        return redirect($path('/agenda/:year?', { year: undefined }))
    }

    if (yearConfig.sessions?.kind === 'sessionize' && !yearConfig.sessions.sessionizeEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    const sessions: TypeOf<typeof sessionsSchema> =
        yearConfig.sessions?.kind === 'sessionize'
            ? await getConfSessions({
                  sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
                  confTimeZone: conferenceConfigPublic.timezone,
              })
            : []

    const allGroup = sessions[0]
    const session = allGroup?.sessions.find((session) => session.id === sessionId)
    if (!session) {
        throw new Response(JSON.stringify({ message: 'No session found' }), { status: 404 })
    }

    const speakers: TypeOf<typeof speakersSchema> =
        yearConfig.sessions?.kind === 'sessionize'
            ? await getConfSpeakers({
                  sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
                  confTimeZone: conferenceConfigPublic.timezone,
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
                ? DateTime.fromISO(session.startsAt).toLocaleString(DateTime.TIME_SIMPLE, { locale: 'en-AU' })
                : null,
            sessionEnd: session.endsAt
                ? DateTime.fromISO(session.endsAt).toLocaleString(DateTime.TIME_SIMPLE, { locale: 'en-AU' })
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
            gradientFrom="#070727"
            gradientToPosition="99%"
            gradientTo="#0E0E43"
            mx="auto"
            p="4"
        >
            <Box maxWidth="1200px" color="#C2C2FF" mx="auto" p={1} fontSize="sm">
                <AppLink to={$path(`/agenda/:year?`, { year })} mb="5" display="block" textDecoration="underline">
                    Back to {year} Agenda
                </AppLink>
                <styled.h2 fontSize="lg" pb={3}>
                    {session.title}
                </styled.h2>
                <styled.span
                    display="none"
                    md={{
                        display: 'block',
                    }}
                    color="#C2C2FF"
                    textWrap="nowrap"
                    pb={3}
                >
                    🕓 {sessionStart} - {sessionEnd}
                </styled.span>
                <styled.span display="block" color="#C2C2FF" textOverflow="ellipsis" textWrap="nowrap" pb={3}>
                    📍 {session.room}
                </styled.span>
                <styled.div>{session.description}</styled.div>
                {session?.speakers?.length ? (
                    <styled.div display="block" color="#C2C2FF">
                        {talkSpeakers.map((speaker) => (
                            <styled.div key={speaker.id} display="flex" alignItems="center">
                                {speaker.profilePicture ? (
                                    <styled.img
                                        src={speaker.profilePicture}
                                        alt={speaker.fullName}
                                        width="120"
                                        height="120"
                                        borderRightRadius="50%"
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

function ConferenceBrowser({ conferences }: { conferences: { year: Year }[] }) {
    return (
        <styled.div padding="4" color="white">
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

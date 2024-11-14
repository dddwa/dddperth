import type { LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { DateTime } from 'luxon'
import { $params, $path } from 'remix-routes'
import { Box, Flex, styled } from 'styled-system/jsx'
import { TypeOf } from 'zod'
import { AppLink } from '~/components/app-link'
import { SponsorSection } from '~/components/page-components/SponsorSection'
import { ConferenceConfigYear, ConferenceImportantInformation, ConferenceYear, Year } from '~/lib/config-types'
import { localeTimeFormat } from '~/lib/dates/formatting'
import { CACHE_CONTROL } from '~/lib/http.server'
import { conferenceConfig } from '../config/conference-config'
import { getConfSessions, getConfSpeakers, sessionsSchema, speakersSchema } from '../lib/sessionize.server'

export async function loader({ params, context }: LoaderFunctionArgs) {
    const { year, sessionId } = $params('/agenda/:year/talk/:sessionId', params)

    const yearConfigLookup = (conferenceConfig.conferences as Record<Year, ConferenceConfigYear | undefined>)[
        year as Year
    ]

    if (!yearConfigLookup || 'cancelledMessage' in yearConfigLookup) {
        if (!params.year) {
            throw new Response(JSON.stringify({ message: 'No config for year' }), { status: 404 })
        }

        return redirect($path('/agenda/:year?', { year: undefined }))
    }

    const yearConfig: ConferenceImportantInformation = params.year
        ? getImportantInformation(yearConfigLookup)
        : context.conferenceState.conference

    if (yearConfig.sessions?.kind === 'sessionize' && !yearConfig.sessions.sessionizeEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    const sessions: TypeOf<typeof sessionsSchema> =
        yearConfig.sessions?.kind === 'sessionize'
            ? await getConfSessions({
                  sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
                  confTimeZone: conferenceConfig.timezone,
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
                  confTimeZone: conferenceConfig.timezone,
              })
            : []
    const talkSpeakers = session.speakers.map((speakerId) => speakers.find((speaker) => speaker.id === speakerId.id))

    return json(
        {
            year: year as Year,
            sponsors: yearConfigLookup.sponsors,
            conferences: Object.values(conferenceConfig.conferences).map((conf) => ({
                year: conf.year,
            })),
            session,
            talkSpeakers,
            sessionStart: DateTime.fromISO(session.startsAt).toLocaleString(DateTime.TIME_SIMPLE),
            sessionEnd: DateTime.fromISO(session.endsAt).toLocaleString(DateTime.TIME_SIMPLE),
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

function getImportantInformation(yearConfig: ConferenceYear): ConferenceImportantInformation {
    return {
        date: yearConfig.conferenceDate?.toISO(),
        year: yearConfig.year,
        sponsors: yearConfig.sponsors,
        sessions: yearConfig.sessions,
        ticketPrice: yearConfig.ticketPrice,
        votingOpens: yearConfig.talkVotingDates?.opens.toLocaleString(localeTimeFormat),
    }
}

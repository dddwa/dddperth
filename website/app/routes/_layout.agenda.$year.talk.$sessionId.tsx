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
import { getConfSessions, sessionsSchema } from '../lib/sessionize.server'

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

    return json(
        {
            year: year as Year,
            sponsors: yearConfigLookup.sponsors,
            conferences: Object.values(conferenceConfig.conferences).map((conf) => ({
                year: conf.year,
            })),
            session,
            sessionStart: DateTime.fromISO(session.startsAt).toLocaleString(DateTime.TIME_SIMPLE),
            sessionEnd: DateTime.fromISO(session.endsAt).toLocaleString(DateTime.TIME_SIMPLE),
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

export default function Agenda() {
    const { session, sponsors, conferences, year, sessionStart, sessionEnd } = useLoaderData<typeof loader>()

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
                <AppLink to={$path(`/agenda/:year?`, { year })} mb="5" display="block">
                    Back to {year} Agenda
                </AppLink>
                <styled.h2 fontSize="lg">{session.title}</styled.h2>
                <styled.span
                    display="none"
                    md={{
                        display: 'block',
                    }}
                    color="#C2C2FF"
                    textWrap="nowrap"
                >
                    🕓 {sessionStart} - {sessionEnd}
                </styled.span>
                <styled.span display="block" color="#C2C2FF" textOverflow="ellipsis" textWrap="nowrap">
                    📍 {session.room}
                </styled.span>
                {session?.speakers?.length ? (
                    <styled.span display="block" color="#C2C2FF">
                        💬 {session?.speakers.map((speaker) => speaker.name)?.join(', ')}
                    </styled.span>
                ) : null}
                <styled.div>{session.description}</styled.div>
            </Box>

            <SponsorSection sponsors={sponsors} year={year} />

            <ConferenceBrowser conferences={conferences} />
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
        sessions: yearConfig.sessions,
        ticketPrice: yearConfig.ticketPrice,
        votingOpens: yearConfig.talkVotingDates?.opens.toLocaleString(localeTimeFormat),
    }
}

import type { LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { DateTime } from 'luxon'
import { Fragment } from 'react'
import { $path } from 'remix-routes'
import { Box, Flex, styled } from 'styled-system/jsx'
import { TypeOf } from 'zod'
import {
  ConferenceConfigYear,
  ConferenceImportantInformation,
  ConferenceYear,
  Sponsor,
  Year,
  YearSponsors,
} from '~/lib/config-types'
import { conferenceConfig } from '../config/conference-config'
import { formatDate, getScheduleGrid, gridSmartSchema } from '../lib/sessionize.server'
import { slugify } from '../lib/slugify'

export async function loader({ params, context }: LoaderFunctionArgs) {
  if (params.year && !/\d{4}/.test(params.year)) {
    return redirect($path('/agenda/:year?', { year: undefined }))
  }

  const year =
    params.year && /\d{4}/.test(params.year) ? (params.year as Year) : context.conferenceState.conference.year

  const yearConfigLookup = (conferenceConfig.conferences as Record<Year, ConferenceConfigYear | undefined>)[year]
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

  const schedules: TypeOf<typeof gridSmartSchema> =
    yearConfig.sessions?.kind === 'sessionize'
      ? await getScheduleGrid({
          sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
          confTimeZone: conferenceConfig.timezone,
        })
      : // TODO Deal with data type
        []

  const schedule = schedules[0]

  return json(
    {
      year,
      sponsors: yearConfigLookup.sponsors,
      conferences: Object.values(conferenceConfig.conferences).map((conf) => ({
        year: conf.year,
      })),
      schedule: schedule
        ? {
            ...schedule,
            dateSlug: slugify(
              formatDate(schedule.date, {
                month: 'short',
                day: 'numeric',
              }),
            ),
            dateISO: schedule.date,
            dateFormatted: formatDate(schedule.date, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
            dateFormattedShort: formatDate(schedule.date, {
              month: 'short',
              day: 'numeric',
            }),
          }
        : undefined,
    },
    // { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
  )
}

export default function Agenda() {
  const { schedule, sponsors, conferences, year } = useLoaderData<typeof loader>()
  const availableTimeSlots = schedule?.timeSlots.map((timeSlot) => timeSlot.slotStart.replace(/:/g, ''))

  if (!schedule) {
    return (
      <Box color="white" textAlign="center" fontSize="3xl" mt="10">
        <p>
          {conferenceConfig.name} {year} agenda has not been announced
        </p>

        <SponsorSection year={year} sponsors={sponsors} />

        <ConferenceBrowser conferences={conferences} />
      </Box>
    )
  }

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
      <Box
        maxWidth="1200px"
        color="#C2C2FF"
        mx="auto"
        p={1}
        fontSize="sm"
        style={
          {
            /**
                         * Note 1:
                         * Use 24hr time for gridline names for simplicity
                         *
                         * Note 2: Use "auto" instead of "1fr" for a more compact schedule where height of a slot is not proportional to the session length. Implementing a "compact" shortcode attribute might make sense for this!
                         *
                         Try 0.5fr for more compact equal rows. I don't quite understand how that works :)
                         */
            '--slot-rows': [
              '[rooms] auto',
              ...schedule.timeSlots.map((timeSlot) => `[time-${timeSlot.slotStart.replace(/:/g, '')}] auto`),
            ].join(' '),
            '--room-columns': [
              '[times] auto',
              ...schedule.rooms.map((room, index, rooms) =>
                index === 0
                  ? `[room-${room.id}-start] 1fr`
                  : index + 1 === rooms.length
                    ? `[room-${rooms[index - 1].id}-end room-${room.id}-start] 1fr [room-${room.id}-end]`
                    : `[room-${rooms[index - 1].id}-end room-${room.id}-start] 1fr`,
              ),
            ].join(' '),
          } as React.CSSProperties
        }
        md={{
          display: 'grid',
          gridTemplateRows: 'var(--slot-rows)',
          gridTemplateColumns: 'var(--room-columns)',
          gridGap: '1',
        }}
      >
        {schedule.rooms.map((room) => (
          /* hidden on small screens and browsers without grid support */
          <Flex
            key={room.id}
            style={{ '--room-column': `room-${room.id}` } as React.CSSProperties}
            aria-hidden="true"
            justifyContent="center"
            alignItems="center"
            textAlign="center"
            gridColumn="var(--room-column)"
            gridRow="rooms"
            display="none"
            rounded="sm"
            bgColor="#8D8DFF"
            color="#070727"
            fontWeight="semibold"
            fontSize="sm"
            padding={2}
            md={{
              display: 'block',
              position: 'sticky',
              top: 4,
              zIndex: 1000,
            }}
          >
            {room.name}
          </Flex>
        ))}

        {schedule.timeSlots.map((timeSlot, timeSlotIndex) => {
          const startTime12 = DateTime.fromISO(timeSlot.slotStart).toFormat('h:mm a').toLowerCase()
          const timeSlotSimple = timeSlot.slotStart.replace(/:/g, '')
          const nextTimeSlot = schedule.timeSlots[timeSlotIndex + 1]
          const nextTimeSlotStart = nextTimeSlot?.slotStart.replace(/:/g, '')

          return (
            <Fragment key={timeSlot.slotStart}>
              <styled.h2 gridColumn="times" style={{ gridRow: `time-${timeSlotSimple}` }} mt="2" md={{ mt: 0 }}>
                {startTime12}
                {nextTimeSlot?.slotStart ? (
                  <styled.span display={{}} md={{ display: 'none' }}>
                    {' '}
                    - {DateTime.fromISO(nextTimeSlot.slotStart).toFormat('h:mm a').toLowerCase()}
                  </styled.span>
                ) : null}
              </styled.h2>

              {timeSlot.rooms.map((room) => {
                const fullSession = schedule.rooms
                  .find((r) => r.id === room.id)
                  ?.sessions.find((session) => session.id === room.session.id)
                const endsAtTime = fullSession?.endsAt.replace(/\d{4}-\d{2}-\d{2}T/, '')
                const endTime12 = fullSession?.endsAt
                  ? DateTime.fromISO(fullSession.endsAt).toFormat('h:mm a').toLowerCase()
                  : undefined

                const timeSlotEnd = endsAtTime?.replace(/:/g, '') ?? ''
                const earliestEnd = !availableTimeSlots?.includes(timeSlotEnd)
                  ? nextTimeSlotStart
                  : timeSlotEnd ?? nextTimeSlotStart

                return (
                  <styled.div
                    key={room.id}
                    marginBottom="0"
                    md={{ marginBottom: 1 }}
                    style={{
                      gridRow: `time-${timeSlotSimple} / time-${earliestEnd}`,
                      gridColumn:
                        timeSlot.rooms.length === 1
                          ? `room-${schedule.rooms.at(0)?.id} / room-${schedule.rooms.at(-1)?.id}`
                          : `room-${room.id}`,
                    }}
                  >
                    <Box
                      rounded="sm"
                      bgColor="#1F1F4E"
                      fontSize="sm"
                      height="full"
                      padding={2}
                      mt="2"
                      md={{
                        mt: 0,
                      }}
                    >
                      <styled.h3
                        wordWrap="break-word"
                        color="white"
                        fontSize="md"
                        fontWeight="semibold"
                        lineHeight="tight"
                        mb={2}
                      >
                        <a href="#">{fullSession?.title}</a>
                      </styled.h3>
                      <styled.span
                        display="none"
                        md={{
                          display: 'block',
                        }}
                        color="#C2C2FF"
                        textWrap="nowrap"
                      >
                        🕓 {startTime12} - {endTime12}
                      </styled.span>
                      <styled.span display="block" color="#C2C2FF" textOverflow="ellipsis" textWrap="nowrap">
                        📍 {room.name}
                      </styled.span>
                      {fullSession?.speakers?.length ? (
                        <styled.span display="block" color="#C2C2FF">
                          💬 {fullSession?.speakers.map((speaker) => speaker.name)?.join(', ')}
                        </styled.span>
                      ) : null}
                    </Box>
                  </styled.div>
                )
              })}
            </Fragment>
          )
        })}
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

function SponsorSection({ sponsors, year }: { sponsors: YearSponsors | undefined; year: Year }) {
  const renderSponsorCategory = (
    title: string,
    sponsors: Sponsor[] | undefined,
    logoSize: 'xs' | 'sm' | 'md' | 'lg',
  ) => {
    if (!sponsors || sponsors.length === 0) return null

    const maxLogoSize = logoSize === 'lg' ? '250px' : logoSize === 'md' ? '150px' : logoSize === 'sm' ? '100px' : '75px'
    return (
      <styled.div marginBottom="4" background="white" padding="3" borderRadius="lg">
        <styled.h3 marginBottom="3" fontSize="2xl" textAlign="center" color="slate.text">
          {title}
        </styled.h3>
        <styled.div display="flex" flexWrap="wrap" justifyContent="space-around" gap="4" alignItems="center">
          {sponsors.map((sponsor) => (
            <styled.a key={sponsor.name} href={sponsor.website} target="_blank" rel="noopener noreferrer">
              <styled.img
                src={sponsor.logoUrl}
                alt={sponsor.name}
                maxWidth={maxLogoSize}
                width="100%"
                maxHeight={maxLogoSize}
                display="inline-block"
                objectFit="contain"
              />
            </styled.a>
          ))}
        </styled.div>
      </styled.div>
    )
  }

  if (!sponsors) return null

  return (
    <styled.div padding="4">
      <styled.h2 fontSize="4xl" textAlign="center" color="white">
        {year} Sponsors
      </styled.h2>
      {renderSponsorCategory('Platinum Sponsors', sponsors.platinum, 'lg')}
      {renderSponsorCategory('Gold Sponsors', sponsors.gold, 'md')}
      {renderSponsorCategory('Silver Sponsors', sponsors.silver, 'sm')}
      {renderSponsorCategory('Bronze Sponsors', sponsors.bronze, 'xs')}
      {renderSponsorCategory('Community Sponsors', sponsors.community, 'xs')}
      {renderSponsorCategory('Digital Sponsors', sponsors.digital, 'xs')}
      {renderSponsorCategory('Coffee Cart Sponsors', sponsors.coffeeCart, 'xs')}
      {renderSponsorCategory('Quiet Room Sponsors', sponsors.quietRoom, 'xs')}
      {renderSponsorCategory('Keynote Sponsors', sponsors.keynotes, 'sm')}
    </styled.div>
  )
}

function getImportantInformation(yearConfig: ConferenceYear): ConferenceImportantInformation {
  return {
    date: yearConfig.conferenceDate?.toISO(),
    year: yearConfig.year,
    sessions: yearConfig.sessions,
    ticketPrice: yearConfig.ticketPrice,
  }
}

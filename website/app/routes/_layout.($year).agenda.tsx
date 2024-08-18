import type { LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { ReactNode } from 'react'
import { $path } from 'remix-routes'
import { TypeOf } from 'zod'
import { ConferenceImportantInformation, ConferenceYear, Year } from '~/lib/config-types'
import { CACHE_CONTROL } from '~/lib/http.server'
import { conferenceConfig } from '../config/conference-config'
import { formatDate, getScheduleGrid, gridSmartSchema } from '../lib/sessionize.server'
import { slugify } from '../lib/slugify'

export async function loader({ params, context }: LoaderFunctionArgs) {
    if (params.year && !/\d{4}/.test(params.year)) {
        return redirect($path('/:year?/agenda', { year: undefined }))
    }

    const year =
        params.year && /\d{4}/.test(params.year) ? (params.year as Year) : context.conferenceState.conference.year

    const yearConfig: ConferenceImportantInformation = params.year
        ? getImportantInformation((conferenceConfig.conferences as Record<Year, ConferenceYear>)[year])
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
            schedule: {
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
                schedule,
            },
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

// export default function Agenda() {
//     const { schedules: days } = useLoaderData<typeof loader>()
//     const navigate = useNavigate()
//     const location = useLocation()
//     const navigation = useNavigation()
//     const searchParams = new URLSearchParams(
//         navigation.state === 'loading' ? navigation.location.search : location.search,
//     )

//     const requestedDay = searchParams.get('date')

//     return (
//         <div>
//             <h1>Remix Conf Schedule</h1>
//             <div>
//                 <Tabs.Root
//                     value={requestedDay}
//                     onChange={(e) => {
//                         const dateSlug = e.currentTarget.nodeValue
//                         if (dateSlug) {
//                             const searchParams = new URLSearchParams(location.search)
//                             searchParams.set('date', dateSlug)
//                             navigate({ search: `?${searchParams}` }, { replace: true })
//                         }
//                     }}
//                 >
//                     <Tabs.List>
//                         {days.map(({ dateSlug, dateFormatted, dateFormattedShort }) => (
//                             <Tabs.Trigger
//                                 key={dateSlug}
//                                 value={dateSlug}
//                                 // tabIndex={-1}
//                             >
//                                 <div>
//                                     <div>{dateFormatted}</div>
//                                     <div>{dateFormattedShort}</div>
//                                 </div>
//                             </Tabs.Trigger>
//                         ))}
//                     </Tabs.List>

//                     {days.map(({ dateSlug, sessions }) => (
//                         <Tabs.Content key={dateSlug} value={dateSlug}>
//                             <table>
//                                 <thead>
//                                     <tr>
//                                         <th>Time</th>
//                                         <th>Speakers</th>
//                                         <th>Event</th>
//                                         <th>Description</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {sessions.map((session) => {
//                                         return (
//                                             <tr key={session.id}>
//                                                 <td>
//                                                     <p>
//                                                         <span>{session.startsAtFormatted}</span> –{' '}
//                                                         <span>{session.endsAtFormatted}</span>
//                                                     </p>
//                                                 </td>
//                                                 <td>
//                                                     {session.speakers.map((speaker) => {
//                                                         const speakerInitials = [
//                                                             speaker.nameFirst?.charAt(0),
//                                                             speaker.nameLast?.charAt(0),
//                                                         ]
//                                                             .filter(Boolean)
//                                                             .join('')
//                                                         return (
//                                                             <div key={speaker.id}>
//                                                                 {speaker.imgUrl ? (
//                                                                     <img src={speaker.imgUrl} alt="" loading="lazy" />
//                                                                 ) : (
//                                                                     <div aria-hidden>{speakerInitials}</div>
//                                                                 )}
//                                                                 <span className="sr-only">
//                                                                     Presented by {session.speakersFormatted}
//                                                                 </span>
//                                                             </div>
//                                                         )
//                                                     })}
//                                                 </td>
//                                                 <td>
//                                                     <h3>{session.title}</h3>
//                                                     {session.speakersFormatted ? (
//                                                         <span aria-hidden>
//                                                             Presented by {session.speakersFormatted}
//                                                         </span>
//                                                     ) : null}
//                                                 </td>
//                                                 <td>
//                                                     <div>
//                                                         {session.description
//                                                             ?.split(/[\n\r]/g)
//                                                             .filter(Boolean)
//                                                             .join('\n')
//                                                             .split('\n')
//                                                             .map((line, i) => <p key={i}>{line}</p>)}
//                                                     </div>
//                                                 </td>
//                                             </tr>
//                                         )
//                                     })}
//                                 </tbody>
//                             </table>
//                         </Tabs.Content>
//                     ))}
//                 </Tabs.Root>
//                 <p>
//                     Please note that this is a preliminary schedule and is subject to change. All changes will be
//                     published here ahead of the conference.
//                 </p>
//             </div>
//         </div>
//     )
// }

export default function Agenda() {
    const { schedule } = useLoaderData<typeof loader>()

    return (
        <table>
            <thead>
                <th></th>
                {schedule.rooms.map((room) => (
                    <th key={room.id} scope="col" className="px-6 py-3 whitespace-nowrap min-w-[200px]">
                        {room.name}
                    </th>
                ))}
            </thead>
            <tbody>
                {schedule.timeSlots.map((timeSlot) => (
                    <tr className="bg-white border-b" key={timeSlot.slotStart}>
                        <td className="whitespace-nowrap">{timeSlot.slotStart}</td>
                        {timeSlot.rooms.map((room) => {
                            // if (roomHasSpanningSession(room.id, timeSlot, timeSlots)) {
                            //     return null
                            // }

                            return (
                                <td
                                    key={room.id}
                                    // rowSpan={session ? calculateSlotSpan(session, timeSlots) : undefined}
                                >
                                    <div key={room.session.id}>
                                        <Link to={`session/${room.session.id}`}>{room.session.title}</Link>

                                        <div>
                                            {room.session.speakers.reduce<ReactNode[]>((acc, speaker) => {
                                                if (acc.length > 0) {
                                                    acc.push(', ')
                                                }
                                                acc.push(
                                                    <Link
                                                        key={speaker.id}
                                                        to="#"
                                                        // to={`/agenda/${day}/speaker/${speaker.id}`}
                                                    >
                                                        {speaker.name}
                                                    </Link>,
                                                )

                                                return acc
                                            }, [])}
                                        </div>

                                        {/* {room.session..track ? (
                                                        <div
                                                        >
                                                            {room.session.track.name}
                                                        </div>
                                                    ) : null} */}
                                    </div>
                                </td>
                            )
                        })}
                    </tr>
                ))}
                {/*    {sessions.map((session) => {
                                return (
                                    <tr key={session.id}>
                                        <td>
                                            <p>
                                                <span>{session.startsAtFormatted}</span> –{' '}
                                                <span>{session.endsAtFormatted}</span>
                                            </p>
                                        </td>
                                        <td>
                                            {session.speakers.map((speaker) => {
                                                const speakerInitials = [
                                                    speaker.nameFirst?.charAt(0),
                                                    speaker.nameLast?.charAt(0),
                                                ]
                                                    .filter(Boolean)
                                                    .join('')
                                                return (
                                                    <div key={speaker.id}>
                                                        {speaker.imgUrl ? (
                                                            <img src={speaker.imgUrl} alt="" loading="lazy" />
                                                        ) : (
                                                            <div aria-hidden>{speakerInitials}</div>
                                                        )}
                                                        <span className="sr-only">
                                                            Presented by {session.speakersFormatted}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </td>
                                        <td>
                                            <h3>{session.title}</h3>
                                            {session.speakersFormatted ? (
                                                <span aria-hidden>Presented by {session.speakersFormatted}</span>
                                            ) : null}
                                        </td>
                                        <td>
                                            <div>
                                                {session.description
                                                    ?.split(/[\n\r]/g)
                                                    .filter(Boolean)
                                                    .join('\n')
                                                    .split('\n')
                                                    .map((line, i) => <p key={i}>{line}</p>)}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })} */}
            </tbody>
        </table>
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

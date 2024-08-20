import { FC, useEffect, useState } from 'react'
import { Flex, styled } from 'styled-system/jsx'

interface ImportantDateBoxProps {
    datetime: string
    day: string
    date: string
    time: string
    event: string
    eventCloseTitle?: string
    eventCloseHref?: string
    eventLive?: boolean
    smallSidebar?: boolean // New prop for small sidebar
    showOnlyLive?: boolean // New prop to filter only live events
}

const importantDatesData: ImportantDateBoxProps[] = [
    {
        datetime: '2024-06-14T00:00:00.000Z',
        day: 'Friday',
        date: 'Jun 14',
        time: '8:00am',
        event: 'Call for presentations open',
        eventCloseTitle: 'CFP Closed',
    },
    {
        datetime: '2024-06-21T00:00:00.000Z',
        day: 'Friday',
        date: 'Jun 21',
        time: '8:00am',
        event: 'Ticket sales open',
        eventCloseTitle: 'Buy Tickets ↗',
        eventCloseHref: '/tickets',
        eventLive: true,
    },
    {
        datetime: '2024-07-12T15:59:59.000Z',
        day: 'Friday',
        date: 'Jul 12',
        time: '11:59pm',
        event: 'Call for presentations close',
        eventCloseTitle: 'CFP Closed',
    },
    {
        datetime: '2024-07-22T16:00:00.000Z',
        day: 'Tuesday',
        date: 'Jul 23',
        time: '12:00am',
        event: 'Voting open',
        eventCloseTitle: 'Voting Closed',
    },
    {
        datetime: '2024-08-06T15:59:59.000Z',
        day: 'Tuesday',
        date: 'Aug 6',
        time: '11:59pm',
        event: 'Voting close',
        eventCloseTitle: 'Voting Closed',
    },
    {
        datetime: '2024-08-20T09:00:00.000Z',
        day: 'Tuesday',
        date: 'Aug 20',
        time: '5:00pm',
        event: 'Agenda published',
        eventCloseTitle: 'View Agenda',
        eventCloseHref: '/agenda',
        eventLive: true,
    },
    {
        datetime: '2024-11-15T09:15:00.000Z',
        day: 'Friday',
        date: 'Nov 15',
        time: '05:15pm',
        event: 'Ticket sales close',
        eventLive: true,
    },
    {
        datetime: '2024-11-16T00:00:00.000Z',
        day: 'Saturday',
        date: 'Nov 16',
        time: '8:00am',
        event: 'Conference day',
        eventCloseTitle: 'Get Directions!',
        eventLive: true,
    },
]

const ImportantDateBox: FC<ImportantDateBoxProps> = ({
    datetime,
    day,
    date,
    time,
    event,
    eventCloseTitle,
    eventCloseHref,
    eventLive,
    smallSidebar,
    showOnlyLive,
}) => {
    if (showOnlyLive && !eventLive) {
        return null
    }

    const eventDate = new Date(datetime)
    const currentDate = new Date()
    const isPast = currentDate > eventDate

    const calculateDaysLeft = () => {
        const difference = +eventDate - +new Date()
        return Math.ceil(difference / (1000 * 60 * 60 * 24))
    }

    const [daysLeft, setDaysLeft] = useState(calculateDaysLeft())

    useEffect(() => {
        if (!isPast) {
            const timer = setTimeout(
                () => {
                    setDaysLeft(calculateDaysLeft())
                },
                1000 * 60 * 60 * 24,
            )

            return () => clearTimeout(timer)
        }
    }, [daysLeft, isPast])

    return (
        <Flex
            flexDirection="row"
            justifyContent="space-between"
            rounded="lg"
            color={isPast ? '#C2C2FF' : '#FFF'}
            shadow="sm"
            bgGradient="to-r"
            gradientFrom={isPast ? '#1F1F4E' : '#00BA8D4A'}
            gradientTo={isPast ? '#151544' : '#FF00E91A'}
            borderTop={isPast ? 'none' : '1px solid #FFFFFF2A'}
            p={smallSidebar ? 2 : 4}
        >
            <Flex flexDirection="column">
                <time dateTime={datetime} />
                <styled.p fontSize={smallSidebar ? 'xs' : 'sm'} color="#C2C2FF">
                    {day} {date}, {time}
                </styled.p>
                <styled.h3 fontSize={smallSidebar ? 'sm' : 'lg'} fontWeight="semibold">
                    {event}
                </styled.h3>
            </Flex>

            {eventLive ? (
                <styled.a
                    href={eventCloseHref ? eventCloseHref : '#'}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    borderRightRadius={100}
                    width={smallSidebar ? 100 : 150}
                    fontSize={smallSidebar ? 'xs' : 'md'}
                    paddingY={1}
                    ml={smallSidebar ? 6 : 0}
                    fontWeight="semibold"
                    color={isPast ? '#520030' : '#FFF'}
                    cursor="pointer"
                    _hover={{ gradientTo: isPast ? '#FF52B7' : 'white/10' }}
                    bgGradient="to-r"
                    gradientFrom={isPast ? '#FF52B7' : 'white/10'}
                    gradientTo={isPast ? '#FF8273' : 'white/5'}
                >
                    {!isPast && daysLeft > 0 ? (
                        <div className="countdown">
                            <span>{daysLeft} days left</span>
                        </div>
                    ) : (
                        eventCloseTitle
                    )}
                </styled.a>
            ) : !isPast && daysLeft > 0 ? (
                <div className="countdown">
                    <span>{daysLeft} days left</span>
                </div>
            ) : (
                <styled.button
                    disabled
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    rounded="lg"
                    width={smallSidebar ? 100 : 150}
                    paddingY={1}
                    color="#9c9cd7"
                    bgGradient="to-r"
                    gradientFrom="white/5"
                    gradientTo="transparent"
                >
                    {eventCloseTitle}
                </styled.button>
            )}
        </Flex>
    )
}

export const ImportantDates: React.FC<{ smallSidebar?: boolean; showOnlyLive?: boolean }> = ({
    smallSidebar,
    showOnlyLive,
}) => (
    <Flex flexDirection="column" gap={2}>
        <styled.h2 fontSize={smallSidebar ? 'md' : '4xl'} color="white" fontWeight="semibold" width="fit-content">
            Important Dates
        </styled.h2>
        {importantDatesData.map((dateInfo, index) => (
            <ImportantDateBox key={index} {...dateInfo} smallSidebar={smallSidebar} showOnlyLive={showOnlyLive} />
        ))}
    </Flex>
)

export const Workshops: React.FC = () => (
    <Flex flexDirection="column" gap={2}>
        <styled.h2 fontSize="4xl" color="white" fontWeight="semibold" width="fit-content">
            Workshops
        </styled.h2>
        <styled.p fontSize="md" color="#C2C2FF" mb={4}>
            DDD runs a bunch of workshops to help you come up with some amazing talks to submit to our CFP and a great
            Bio to go with it.
        </styled.p>

        <ImportantDateBox
            datetime="2024-06-25T09:30:00.000Z"
            day="Tuesday"
            date="Jun 25"
            time="05:30PM"
            event="CFP & Bio Workshop - (In Person)"
            eventCloseTitle="Book Now"
            eventCloseHref="https://ti.to/dddperth/f2f-cfp-workshop-2024"
            eventLive={false}
        />
    </Flex>
)

export default ImportantDates

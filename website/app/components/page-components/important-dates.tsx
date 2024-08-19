import { FC, useEffect, useState } from 'react'
import { Flex, styled } from 'styled-system/jsx'

interface ImportantDateBoxProps {
  datetime: string
  day: string
  date: string
  time: string
  event: string
}

const importantDatesData: ImportantDateBoxProps[] = [
  {
    datetime: '2024-08-20T09:00:00.000Z',
    day: 'Tuesday',
    date: 'Aug 20',
    time: '05:00PM',
    event: 'Agenda published',
  },
  {
    datetime: '2024-11-15T09:15:00.000Z',
    day: 'Friday',
    date: 'Nov 15',
    time: '05:15PM',
    event: 'Ticket sales close',
  },
  {
    datetime: '2024-11-16T00:00:00.000Z',
    day: 'Saturday',
    date: 'Nov 16',
    time: '08:00AM',
    event: 'Conference day',
  },
  {
    datetime: '2024-06-14T00:00:00.000Z',
    day: 'Friday',
    date: 'Jun 14',
    time: '08:00AM',
    event: 'Call for presentations open',
  },
  {
    datetime: '2024-06-21T00:00:00.000Z',
    day: 'Friday',
    date: 'Jun 21',
    time: '08:00AM',
    event: 'Ticket sales open',
  },
  {
    datetime: '2024-07-12T15:59:59.000Z',
    day: 'Friday',
    date: 'Jul 12',
    time: '11:59PM',
    event: 'Call for presentations close',
  },
  {
    datetime: '2024-07-22T16:00:00.000Z',
    day: 'Tuesday',
    date: 'Jul 23',
    time: '12:00AM',
    event: 'Voting open',
  },
  {
    datetime: '2024-08-06T15:59:59.000Z',
    day: 'Tuesday',
    date: 'Aug 6',
    time: '11:59PM',
    event: 'Voting close',
  },
]

const ImportantDateBox: FC<ImportantDateBoxProps> = ({ datetime, day, date, time, event }) => {
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
    <Flex flexDirection="column" rounded="lg" bgColor="white" shadow="sm" opacity={isPast ? 0.5 : 1} p={4}>
      <time dateTime={datetime} />
      <styled.p fontSize="sm">
        {day}, {date} - {time}
      </styled.p>
      <styled.h3 textDecoration={isPast ? 'line-through' : 'none'}>{event}</styled.h3>
      {!isPast && daysLeft > 0 && (
        <div className="countdown">
          <span>{daysLeft} days left</span>
        </div>
      )}
    </Flex>
  )
}

export const ImportantDates: React.FC = () => (
  <Flex flexDirection="column" width="fit" mx="auto">
    <styled.h2 color="white">Important Dates</styled.h2>
    <Flex flexDirection="column" gap={6} p={2} maxWidth={800}>
      {importantDatesData.map((dateInfo, index) => (
        <ImportantDateBox key={index} {...dateInfo} />
      ))}
    </Flex>
    <Workshops />
    <WhatNow />
  </Flex>
)

const Workshops = () => (
  <div>
    <h2>Workshops!</h2>
    <p>
      DDD runs a bunch of workshops to help you come up with some amazing talks to submit to our CFP and a great Bio to
      go with it.
    </p>
    <p>
      For more info or to book in click{' '}
      <a rel="noopener" target="_blank" href="https://ti.to/dddperth/f2f-cfp-workshop-2024">
        here
      </a>
    </p>
    <ul>
      <ImportantDateBox
        datetime="2024-06-25T09:30:00.000Z"
        day="Tuesday"
        date="Jun 25"
        time="05:30PM"
        event="CFP & Bio Workshop - (In Person)"
      />
    </ul>
  </div>
)

const WhatNow = () => (
  <div>
    <h2>What now?</h2>
    <a href="/tickets">Purchase a ticket</a>
    <a href="/agenda">Previous agenda</a>
  </div>
)

export default ImportantDates

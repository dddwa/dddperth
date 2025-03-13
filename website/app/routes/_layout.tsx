import { DateTime } from 'luxon'
import type { MetaFunction } from 'react-router'
import { Outlet } from 'react-router'
import { ErrorPage } from '~/components/error-page'
import { Box, Flex } from '~/styled-system/jsx'
import { Acknowledgement } from '../components/acknowledgement'
import { Footer } from '../components/footer/footer'
import { Header } from '../components/header/header'
import { conferenceConfig } from '../config/conference-config'
import type { Route } from './+types/_layout'

export function loader({ context }: Route.LoaderArgs) {
    return {
        conferenceDate: context.conferenceState.conference.date,
    }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [
        {
            title: data?.conferenceDate
                ? `${conferenceConfig.name} | ${DateTime.fromISO(data.conferenceDate).toLocaleString(
                      DateTime.DATE_HUGE,
                      {
                          locale: 'en-AU',
                      },
                  )}`
                : conferenceConfig.name,
        },
        { name: 'description', content: conferenceConfig.description },
    ]
}

export default function Index() {
    return (
        <div>
            <Header />
            <Outlet />
            <Footer />
            <Acknowledgement />
        </div>
    )
}

export function ErrorBoundary() {
    return (
        <div>
            <Header />
            <Flex
                position="relative"
                bgGradient="to-b"
                gradientFrom="#070727"
                gradientToPosition="99%"
                gradientTo="#0E0E43"
                w="100%"
                color="white"
            >
                <Box w="100%" position="relative" maxW="1200px" m="0 auto" md={{ p: '4' }}>
                    <ErrorPage />
                </Box>
            </Flex>
            <Footer />
            <Acknowledgement />
        </div>
    )
}

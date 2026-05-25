import { SponsorQuoteCard } from '~/components/page-components/SponsorSection'
import type { Sponsor } from '~/lib/conference-state-client-safe'
import { Box, Flex, styled } from '~/styled-system/jsx'

export interface SponsorQuotesProps {
    quotes: { sponsor: Sponsor; category: 'platinum' | 'gold' }[]
    year?: string | undefined
    title?: string
}

export function SponsorQuotes({ quotes, year, title = 'What our sponsors say' }: SponsorQuotesProps) {
    if (!quotes || quotes.length === 0) return null

    return (
        <Box as="section" paddingY={{ base: '12', md: '16' }}>
            <styled.h2 fontSize={{ base: '3xl', md: '4xl' }} color="text.primary" marginBottom="2">
                {title}
            </styled.h2>
            <styled.p color="text.secondary" marginBottom="8">
                {year ? `From our ${year} sponsors:` : 'From our recent sponsors:'}
            </styled.p>
            <Flex flexDirection="column" gap="4">
                {quotes.map(({ sponsor, category }) => (
                    <SponsorQuoteCard key={sponsor.name} sponsor={sponsor} category={category} />
                ))}
            </Flex>
        </Box>
    )
}

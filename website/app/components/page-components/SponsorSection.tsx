import { Flex, styled } from 'styled-system/jsx'
import { Sponsor, Year, YearSponsors } from '~/lib/config-types'

export function SponsorSection({ sponsors, year }: { sponsors: YearSponsors | undefined; year: Year }) {
    const sponsorStyles = {
        platinum: { gradientFrom: '#496F7F', logoSize: 'lg' },
        gold: { gradientFrom: '#453927', logoSize: 'md' },
        silver: { gradientFrom: '#2A3251', logoSize: 'sm' },
        bronze: { gradientFrom: '#452927', logoSize: 'xs' },
        room: { gradientFrom: '#1F1F4E', logoSize: 'xs' },
        digital: { gradientFrom: '#371F4E', logoSize: 'xs' },
        community: { gradientFrom: '#1F1F4E', logoSize: 'xs' },
        coffeeCart: { gradientFrom: '#1F1F4E', logoSize: 'xs' },
        quietRoom: { gradientFrom: '#1F1F4E', logoSize: 'xs' },
        keynotes: { gradientFrom: '#1F1F4E', logoSize: 'sm' },
    } as const
    const getSponsorStyle = (category: keyof typeof sponsorStyles) => sponsorStyles[category]

    const renderSponsor = (sponsor: Sponsor, category: keyof typeof sponsorStyles, zIndex: number) => {
        const { gradientFrom } = getSponsorStyle(category)

        return (
            <styled.a
                key={sponsor.name}
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                position="relative"
                display="flex"
                justifyContent="center"
                alignItems="center"
                border="6px solid #0D0D3F"
                style={{
                    background: `linear-gradient(to bottom, ${gradientFrom}, #151544)`,
                    zIndex: zIndex,
                }}
                width={260}
                height={220}
                ml={-6}
                zIndex={1}
                boxShadow="inset -1px 1px 0 0 rgba(255,255,255,0.21)"
                borderRightRadius="full"
            >
                <styled.img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    maxWidth={150}
                    width="100%"
                    maxHeight={90}
                    ml={-3}
                    display="inline-block"
                    objectFit="contain"
                />
                <styled.h5
                    position="absolute"
                    left={3}
                    bottom={3}
                    fontSize="xs"
                    color="white"
                    mixBlendMode="soft-light"
                >
                    {category.charAt(0).toUpperCase() + category.slice(1)} Sponsor
                </styled.h5>
            </styled.a>
        )
    }

    const renderSponsorGroup = (
        title: string,
        sponsorGroups: { sponsors: Sponsor[] | undefined; category: keyof typeof sponsorStyles }[],
    ) => {
        const allSponsors = sponsorGroups.flatMap((group) => group.sponsors || [])
        if (allSponsors.length === 0) return null

        let zIndex = allSponsors.length

        return (
            <Flex flexDirection="column" alignItems="flex-start" marginBottom="4">
                <styled.h3 marginBottom="3" fontSize="2xl" textAlign="center" color="#C2C2FF">
                    {title}
                </styled.h3>
                <Flex flexWrap="wrap" alignItems="center" p={6}>
                    {sponsorGroups.map((group) =>
                        group.sponsors?.map((sponsor) => {
                            const sponsorElement = renderSponsor(sponsor, group.category, zIndex)
                            zIndex -= 1
                            return sponsorElement
                        }),
                    )}
                </Flex>
            </Flex>
        )
    }

    if (!sponsors) return null

    return (
        <Flex flexDirection="column" alignItems="flex-start" marginY={16}>
            <styled.h2 fontSize="4xl" textAlign="center" color="white">
                {year} Sponsors
            </styled.h2>
            {renderSponsorGroup('Platinum', [{ sponsors: sponsors.platinum, category: 'platinum' }])}
            {renderSponsorGroup('Gold', [{ sponsors: sponsors.gold, category: 'gold' }])}
            {renderSponsorGroup('Silver', [{ sponsors: sponsors.silver, category: 'silver' }])}
            {renderSponsorGroup('Bronze', [{ sponsors: sponsors.bronze, category: 'bronze' }])}
            {renderSponsorGroup('Room', [{ sponsors: sponsors.room, category: 'room' }])}
            {renderSponsorGroup('Digital', [{ sponsors: sponsors.digital, category: 'digital' }])}
            {renderSponsorGroup('Other Sponsors', [
                { sponsors: sponsors.community, category: 'community' },
                { sponsors: sponsors.coffeeCart, category: 'coffeeCart' },
                { sponsors: sponsors.quietRoom, category: 'quietRoom' },
                { sponsors: sponsors.keynotes, category: 'keynotes' },
            ])}
        </Flex>
    )
}

import type { Sponsor, Year, YearSponsors } from '~/lib/conference-state-client-safe'
import { Flex, styled } from '~/styled-system/jsx'
import { token } from '~/styled-system/tokens'

const sponsorStyles = {
    platinum: { gradientFrom: 'sponsor.platinum', logoSize: 'lg' },
    gold: { gradientFrom: 'sponsor.gold', logoSize: 'md' },
    silver: { gradientFrom: 'sponsor.silver', logoSize: 'sm' },
    bronze: { gradientFrom: 'sponsor.bronze', logoSize: 'xs' },
    room: { gradientFrom: 'sponsor.room', logoSize: 'xs' },
    digital: { gradientFrom: 'sponsor.digital', logoSize: 'xs' },
    community: { gradientFrom: 'sponsor.community', logoSize: 'xs' },
    coffeeCart: { gradientFrom: 'sponsor.community', logoSize: 'xs' },
    quietRoom: { gradientFrom: 'sponsor.community', logoSize: 'xs' },
    keynotes: { gradientFrom: 'sponsor.community', logoSize: 'sm' },
} as const

function getSponsorStyle(category: keyof typeof sponsorStyles) {
    return sponsorStyles[category]
}

export function SponsorSection({ sponsors, year }: { sponsors: YearSponsors | undefined; year: Year }) {
    if (!sponsors) return null

    return (
        <Flex flexDirection="column" alignItems="flex-start" marginY={16}>
            <styled.h2 fontSize="4xl" textAlign="center" color="white">
                {year} Sponsors
            </styled.h2>
            <SponsorGroup title="Platinum" sponsorGroups={[{ sponsors: sponsors.platinum, category: 'platinum' }]} />
            <SponsorGroup title="Gold" sponsorGroups={[{ sponsors: sponsors.gold, category: 'gold' }]} />
            <SponsorGroup title="Silver" sponsorGroups={[{ sponsors: sponsors.silver, category: 'silver' }]} />
            <SponsorGroup title="Bronze" sponsorGroups={[{ sponsors: sponsors.bronze, category: 'bronze' }]} />
            <SponsorGroup title="Room" sponsorGroups={[{ sponsors: sponsors.room, category: 'room' }]} />
            <SponsorGroup title="Digital" sponsorGroups={[{ sponsors: sponsors.digital, category: 'digital' }]} />
            <SponsorGroup
                title="Other Sponsors"
                sponsorGroups={[
                    { sponsors: sponsors.community, category: 'community' },
                    { sponsors: sponsors.coffeeCart, category: 'coffeeCart' },
                    { sponsors: sponsors.quietRoom, category: 'quietRoom' },
                    { sponsors: sponsors.keynotes, category: 'keynotes' },
                ]}
            />
        </Flex>
    )
}

function SponsorGroup({
    title,
    sponsorGroups,
}: {
    title: string
    sponsorGroups: { sponsors: Sponsor[] | undefined; category: keyof typeof sponsorStyles }[]
}) {
    const allSponsors = sponsorGroups.flatMap((group) => group.sponsors || [])
    if (allSponsors.length === 0) return null

    let zIndex = allSponsors.length

    return (
        <Flex flexDirection="column" alignItems="flex-start" marginBottom="4">
            <styled.h3 marginBottom="3" fontSize="2xl" textAlign="center" color="text.secondary">
                {title}
            </styled.h3>
            <Flex flexWrap="wrap" alignItems="center" p="6">
                {sponsorGroups.map((group) =>
                    group.sponsors?.map((sponsor) => {
                        const sponsorElement = (
                            <SponsorComponent
                                key={sponsor.name}
                                sponsor={sponsor}
                                category={group.category}
                                zIndex={zIndex}
                            />
                        )
                        zIndex -= 1
                        return sponsorElement
                    }),
                )}
            </Flex>
        </Flex>
    )
}

function SponsorComponent({
    sponsor,
    category,
    zIndex,
}: {
    sponsor: Sponsor
    category: keyof typeof sponsorStyles
    zIndex: number
}) {
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
            border="sponsor"
            style={{
                background: `linear-gradient(to bottom, ${token(`colors.${gradientFrom}`)}, ${token('colors.surface.card-alt')})`,
                zIndex: zIndex,
            }}
            width="260px"
            height="220px"
            ml="-6"
            zIndex="1"
            boxShadow="inset -1px 1px 0 0 rgba(255,255,255,0.21)"
            borderRightRadius="full"
        >
            <styled.img
                src={sponsor.logoUrlDarkMode}
                alt={sponsor.name}
                maxWidth="150px"
                width="100%"
                maxHeight="90px"
                ml="-3"
                display="inline-block"
                objectFit="contain"
            />
            <styled.h5 position="absolute" left="3" bottom="3" fontSize="xs" color="text.on-brand" mixBlendMode="soft-light">
                {category.charAt(0).toUpperCase() + category.slice(1)} Sponsor
            </styled.h5>
        </styled.a>
    )
}

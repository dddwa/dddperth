import type { Sponsor, Year, YearSponsors } from '~/lib/conference-state-client-safe'
import { Flex, styled } from '~/styled-system/jsx'

const sponsorStyles = {
    platinum: { gradientFrom: '#496F7F', logoSize: 'lg' },
    gold: { gradientFrom: '#453927', logoSize: 'md' },
    silver: { gradientFrom: '#2A3251', logoSize: 'sm' },
    bronze: { gradientFrom: '#452927', logoSize: 'xs' },
    room: { gradientFrom: '#1F1F4E', logoSize: 'xs' },
    digital: { gradientFrom: '#371F4E', logoSize: 'xs' },
    community: { gradientFrom: '#134343', logoSize: 'xs' },
    coffeeCart: { gradientFrom: '#134343', logoSize: 'xs' },
    quietRoom: { gradientFrom: '#134343', logoSize: 'xs' },
    keynotes: { gradientFrom: '#134343', logoSize: 'sm' },
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
            <styled.h3 marginBottom="3" fontSize="2xl" textAlign="center" color="#C2C2FF">
                {title}
            </styled.h3>
            <Flex flexWrap="wrap" alignItems="center" p={6}>
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
                src={sponsor.logoUrlDarkMode}
                alt={sponsor.name}
                maxWidth={150}
                width="100%"
                maxHeight={90}
                ml={-3}
                display="inline-block"
                objectFit="contain"
            />
            <styled.h5 position="absolute" left={3} bottom={3} fontSize="xs" color="white" mixBlendMode="soft-light">
                {category.charAt(0).toUpperCase() + category.slice(1)} Sponsor
            </styled.h5>
        </styled.a>
    )
}

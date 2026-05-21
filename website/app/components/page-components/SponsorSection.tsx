import { Link } from 'react-router'
import type { Sponsor, Year, YearSponsors } from '~/lib/conference-state-client-safe'
import { Flex, styled } from '~/styled-system/jsx'
import { token } from '~/styled-system/tokens'
import { SponsorLogo } from '~/components/sponsor-logo'

const StyledLink = styled(Link)

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

    // When the heading is shown but every tier is still empty (typical for an
    // upcoming year before sponsors are announced) the section otherwise renders
    // an awkward lone H2. Show a CTA pointing at the sponsorship page instead.
    const hasAnySponsor = (Object.values(sponsors) as (Sponsor[] | undefined)[]).some(
        (group) => Array.isArray(group) && group.length > 0,
    )

    if (!hasAnySponsor) {
        return (
            <Flex flexDirection="column" alignItems="flex-start" marginY="16">
                <SponsorCta year={year} />
            </Flex>
        )
    }

    return (
        <Flex flexDirection="column" alignItems="flex-start" marginY="16">
            <styled.h2 fontSize="4xl" textAlign="center" color="text.primary">
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

function SponsorCta({ year }: { year: Year }) {
    return (
        <Flex
            width="full"
            flexDirection="column"
            alignItems="center"
            textAlign="center"
            gap="4"
            padding={{ base: '5', md: '6' }}
            bgGradient="to-r"
            gradientFrom="surface.card"
            gradientTo="surface.card-alt"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border.default"
            borderLeftWidth="4px"
            borderLeftColor="sponsor.platinum"
            rounded="md"
            boxShadow="md"
        >
            <Flex flexDirection="column" gap="1" alignItems="center">
                <styled.p fontSize={{ base: 'lg', md: 'xl' }} fontWeight="semibold" color="text.primary">
                    {year} sponsors not announced yet
                </styled.p>
                <styled.p fontSize={{ base: 'sm', md: 'md' }} color="text.secondary" maxWidth="[60ch]">
                    Want your logo here? DDD Perth runs on the generosity of our sponsors — partner with us to support
                    Perth's tech community.
                </styled.p>
            </Flex>
            <StyledLink
                to="/sponsorship"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                paddingX="5"
                paddingY="3"
                rounded="md"
                fontWeight="semibold"
                fontSize="sm"
                color="text.on-brand"
                bgGradient="to-r"
                gradientFrom="gradient.cta-mid"
                gradientTo="gradient.cta-end"
                _hover={{ gradientTo: 'gradient.cta-mid' }}
            >
                Become a sponsor →
            </StyledLink>
        </Flex>
    )
}

const tieredCategories = new Set<keyof typeof sponsorStyles>(['platinum', 'gold'])

function SponsorGroup({
    title,
    sponsorGroups,
}: {
    title: string
    sponsorGroups: { sponsors: Sponsor[] | undefined; category: keyof typeof sponsorStyles }[]
}) {
    const logoSponsors = sponsorGroups.map((group) => ({
        ...group,
        sponsors: tieredCategories.has(group.category) ? [] : (group.sponsors ?? []),
    }))

    const cardSponsors = sponsorGroups.flatMap((group) =>
        tieredCategories.has(group.category)
            ? (group.sponsors ?? []).map((sponsor) => ({ sponsor, category: group.category }))
            : [],
    )

    if (logoSponsors.every((g) => g.sponsors.length === 0) && cardSponsors.length === 0) return null

    let zIndex = logoSponsors.reduce((sum, g) => sum + g.sponsors.length, 0)

    return (
        <Flex width="full" flexDirection="column" alignItems="flex-start" marginBottom="8">
            <styled.h3 marginBottom="3" fontSize="2xl" textAlign="center" color="text.secondary">
                {title}
            </styled.h3>
            {logoSponsors.some((g) => g.sponsors.length > 0) ? (
                <Flex flexWrap="wrap" alignItems="center" p="6">
                    {logoSponsors.map((group) =>
                        group.sponsors.map((sponsor) => {
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
            ) : null}
            {cardSponsors.length > 0 ? (
                <Flex width="full" flexDirection="column" gap="4" marginTop="2">
                    {cardSponsors.map(({ sponsor, category }) => (
                        <SponsorQuoteCard key={`card-${sponsor.name}`} sponsor={sponsor} category={category} />
                    ))}
                </Flex>
            ) : null}
        </Flex>
    )
}

export function SponsorQuoteCard({
    sponsor,
    category,
}: {
    sponsor: Sponsor
    category: keyof typeof sponsorStyles
}) {
    const accent = category === 'platinum' ? 'sponsor.platinum' : 'sponsor.gold'

    return (
        <Flex
            as="article"
            flexDirection={{ base: 'column', md: 'row' }}
            gap={{ base: '4', md: '6' }}
            alignItems={{ base: 'flex-start', md: 'center' }}
            bgColor="surface.elevated"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border.default"
            borderLeftWidth="4px"
            borderLeftColor={accent}
            rounded="md"
            padding={{ base: '4', md: '6' }}
            boxShadow="md"
        >
            <styled.a
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                flexShrink="0"
                display="flex"
                alignItems="center"
                justifyContent="center"
                width={{ base: 'full', md: '[180px]' }}
                height="[120px]"
                aria-label={`Visit ${sponsor.name}`}
            >
                <SponsorLogo
                    logoUrlDarkMode={sponsor.logoUrlDarkMode}
                    logoUrlLightMode={sponsor.logoUrlLightMode}
                    name={sponsor.name}
                    maxWidth="full"
                    maxHeight="full"
                    objectFit="contain"
                />
            </styled.a>
            <Flex flexDirection="column" gap="2" flex="1">
                {sponsor.quote && sponsor.quote.trim().length > 0 ? (
                    <styled.blockquote
                        fontSize={{ base: 'sm', md: 'md' }}
                        color="text.primary"
                        lineHeight="relaxed"
                        whiteSpace="pre-line"
                    >
                        {sponsor.quote}
                    </styled.blockquote>
                ) : null}
                <styled.a
                    href={sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="interactive.active"
                    fontSize="sm"
                    fontWeight="semibold"
                    alignSelf="flex-start"
                    _hover={{ color: 'white', textDecoration: 'underline' }}
                >
                    Visit {sponsor.name} →
                </styled.a>
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
                boxShadow: 'inset -1px 1px 0 0 rgba(255,255,255,0.21)',
            }}
            width="[260px]"
            height="[220px]"
            ml="-6"
            borderRightRadius="full"
        >
            <SponsorLogo
                logoUrlDarkMode={sponsor.logoUrlDarkMode}
                logoUrlLightMode={sponsor.logoUrlLightMode}
                name={sponsor.name}
                maxWidth="[150px]"
                width="full"
                maxHeight="[90px]"
                ml="-3"
                objectFit="contain"
            />
            <styled.h5 position="absolute" left="3" bottom="3" fontSize="xs" color="text.secondary">
                {category.charAt(0).toUpperCase() + category.slice(1)} Sponsor
            </styled.h5>
        </styled.a>
    )
}

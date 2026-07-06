import { useState } from 'react'
import { Link } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import type { Sponsor, Year, YearSponsors } from '~/lib/conference-state-client-safe'
import { Flex, styled } from '~/styled-system/jsx'
import { token } from '~/styled-system/tokens'
import { SponsorLogo } from '~/components/sponsor-logo'

// Quotes shorter than this fit comfortably within ~3 lines on desktop, so the
// expand toggle would be noise. Tuned against the current 2025 sponsor copy.
const QUOTE_CLAMP_THRESHOLD = 240

function sponsorGroupAnchor(title: string) {
    return `sponsors-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
}

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

type OverviewGroup = {
    title: string
    sponsors: Sponsor[]
    /**
     * Logo height in px — passed via a CSS variable on the row so we can keep
     * a single img selector while varying size per tier. (Panda can't extract
     * arbitrary values built from runtime template literals, so we drive height
     * with a style-prop CSS var rather than `height="[${n}px]"`.)
     */
    logoHeight: number
}

export function SponsorOverview({ sponsors }: { sponsors: YearSponsors }) {
    const groups: OverviewGroup[] = [
        { title: 'Platinum', sponsors: sponsors.platinum ?? [], logoHeight: 36 },
        { title: 'Gold', sponsors: sponsors.gold ?? [], logoHeight: 28 },
        { title: 'Silver', sponsors: sponsors.silver ?? [], logoHeight: 24 },
        { title: 'Bronze', sponsors: sponsors.bronze ?? [], logoHeight: 20 },
        { title: 'Room', sponsors: sponsors.room ?? [], logoHeight: 20 },
        { title: 'Digital', sponsors: sponsors.digital ?? [], logoHeight: 20 },
        {
            title: 'Other Sponsors',
            sponsors: [
                ...(sponsors.community ?? []),
                ...(sponsors.coffeeCart ?? []),
                ...(sponsors.quietRoom ?? []),
                ...(sponsors.keynotes ?? []),
            ],
            logoHeight: 20,
        },
    ].filter((g) => g.sponsors.length > 0)

    if (groups.length === 0) return null

    return (
        <Flex
            as="nav"
            aria-label="Sponsor tiers"
            width="full"
            flexDirection="column"
            gap="4"
            padding={{ base: '4', md: '5' }}
            marginBottom="10"
            bgColor="surface.elevated"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border.default"
            rounded="md"
        >
            <styled.h2 fontSize="lg" fontWeight="semibold" color="text.primary" margin="0">
                Sponsors
            </styled.h2>
            {groups.map((group) => (
                <Flex
                    key={group.title}
                    flexDirection={{ base: 'column', sm: 'row' }}
                    alignItems={{ base: 'flex-start', sm: 'center' }}
                    gap={{ base: '2', sm: '4' }}
                    style={{ '--logo-h': `${group.logoHeight}px` } as React.CSSProperties}
                >
                    <styled.a
                        href={`#${sponsorGroupAnchor(group.title)}`}
                        fontSize="sm"
                        fontWeight="semibold"
                        color="text.secondary"
                        flexShrink="0"
                        minWidth={{ sm: '[110px]' }}
                        _hover={{ color: 'text.highlight', textDecoration: 'underline' }}
                    >
                        {group.title} →
                    </styled.a>
                    <Flex flexWrap="wrap" alignItems="center" gap={{ base: '3', md: '4' }} rowGap="3">
                        {group.sponsors.map((sponsor) => (
                            <styled.a
                                key={`${group.title}-${sponsor.name}`}
                                href={`#${sponsorGroupAnchor(group.title)}`}
                                display="inline-flex"
                                alignItems="center"
                                title={sponsor.name}
                                aria-label={`Jump to ${sponsor.name} in ${group.title} sponsors`}
                                opacity="0.85"
                                _hover={{ opacity: '1' }}
                            >
                                <styled.img
                                    src={sponsor.logoUrlDarkMode}
                                    alt={sponsor.name}
                                    display="none"
                                    _dark={{ display: 'block' }}
                                    height="[var(--logo-h)]"
                                    width="auto"
                                    maxWidth="[120px]"
                                    objectFit="contain"
                                />
                                <styled.img
                                    src={sponsor.logoUrlLightMode}
                                    alt=""
                                    aria-hidden="true"
                                    display="block"
                                    _dark={{ display: 'none' }}
                                    height="[var(--logo-h)]"
                                    width="auto"
                                    maxWidth="[120px]"
                                    objectFit="contain"
                                />
                            </styled.a>
                        ))}
                    </Flex>
                </Flex>
            ))}
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
                    Want your logo here? {conferenceManifest.public.name} runs on the generosity of our sponsors —
                    partner with us to support our local tech community.
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
        <Flex
            width="full"
            flexDirection="column"
            alignItems="flex-start"
            marginBottom="8"
            id={sponsorGroupAnchor(title)}
            scrollMarginTop="20"
        >
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
    const quote = sponsor.quote?.trim() ?? ''
    const isClampable = quote.length > QUOTE_CLAMP_THRESHOLD
    const [expanded, setExpanded] = useState(false)
    const shouldClamp = isClampable && !expanded

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
                {quote.length > 0 ? (
                    <styled.blockquote
                        fontSize={{ base: 'sm', md: 'md' }}
                        color="text.primary"
                        lineHeight="relaxed"
                        whiteSpace="pre-line"
                        style={
                            shouldClamp
                                ? {
                                      display: '-webkit-box',
                                      WebkitBoxOrient: 'vertical',
                                      WebkitLineClamp: 3,
                                      overflow: 'hidden',
                                  }
                                : undefined
                        }
                    >
                        {quote}
                    </styled.blockquote>
                ) : null}
                {isClampable ? (
                    <styled.button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        alignSelf="flex-start"
                        color="text.secondary"
                        fontSize="sm"
                        fontWeight="semibold"
                        background="transparent"
                        border="none"
                        cursor="pointer"
                        padding="0"
                        _hover={{ color: 'interactive.active', textDecoration: 'underline' }}
                        aria-expanded={expanded}
                    >
                        {expanded ? 'Show less ▴' : 'Read more ▾'}
                    </styled.button>
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

import { SponsorLogo } from '~/components/sponsor-logo'
import { Box, Grid, styled } from '~/styled-system/jsx'

export interface PastSponsorsGridProps {
    sponsors: { name: string; logoDarkMode: string; logoLightMode: string; website: string }[]
    title?: string
    lede?: string
}

export function PastSponsorsGrid({
    sponsors,
    title = 'Trusted by',
    lede = "A decade of sponsors who've made DDD Perth possible.",
}: PastSponsorsGridProps) {
    if (!sponsors || sponsors.length === 0) return null

    return (
        <Box as="section" paddingY={{ base: '12', md: '16' }}>
            <styled.h2 fontSize={{ base: '3xl', md: '4xl' }} color="text.primary" marginBottom="2">
                {title}
            </styled.h2>
            {lede ? (
                <styled.p color="text.secondary" marginBottom="8">
                    {lede}
                </styled.p>
            ) : null}
            <Grid
                gridTemplateColumns={{
                    base: 'repeat(2, 1fr)',
                    md: 'repeat(4, 1fr)',
                    lg: 'repeat(5, 1fr)',
                }}
                gap="3"
            >
                {sponsors.map((s) => (
                    <styled.a
                        key={s.name}
                        href={s.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        height="[100px]"
                        bgColor="surface.card"
                        borderWidth="1px"
                        borderColor="border.default"
                        rounded="md"
                        padding="3"
                        _hover={{ borderColor: 'border.emphasis' }}
                        aria-label={`Visit ${s.name}`}
                    >
                        <SponsorLogo
                            logoUrlDarkMode={s.logoDarkMode}
                            logoUrlLightMode={s.logoLightMode}
                            name={s.name}
                            maxWidth="full"
                            maxHeight="full"
                            objectFit="contain"
                        />
                    </styled.a>
                ))}
            </Grid>
        </Box>
    )
}

import { conferenceDayStart } from '~/lib/dates/temporal'
import { useEffect, useRef } from 'react'
import type { ConferenceVenue } from '~/lib/conference-state-client-safe'
import { heroMarks } from 'virtual:conference-brand'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { AppLink } from '../app-link'
import { HeaderContainer } from '../page-layout'

// The Ds finish drifting after this much page scroll, then hold.
const PARALLAX_SCROLL_RANGE = 600

// Vertical fade applied to each parallax D so the bottom of the SVG dissolves
// into whatever surface sits beneath it. The Ds are taller than the panel and
// drift further on scroll, so without this they'd hard-edge onto the body.
const DRIFT_MASK = {
    maskImage: 'linear-gradient(to bottom, black 0, black 55%, transparent 95%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 0, black 55%, transparent 95%)',
} as const

export function HomepageHeroPanel({
    conferenceDate,
    venue,
}: {
    conferenceDate: string | undefined
    venue: ConferenceVenue | undefined
}) {
    const [FrontMark, MiddleMark, BackMark] = heroMarks
    // Extend parallax travel so the Ds keep moving as you scroll past the panel
    // and slide down behind the intro paragraph. Distances are intentionally subtle
    // so it reads as a gentle drift rather than a strong parallax.
    const middleRef = useScrollDrift(160)
    const backRef = useScrollDrift(260)

    return (
        <Flex
            height="auto"
            direction="column"
            alignItems="center"
            width="full"
            gradientFrom="gradient.hero-start"
            gradientTo="gradient.hero-end"
            gap="6"
            pt={{ base: '0', xl: '24' }}
            bgGradient="to-b"
            md={{ gap: '8' }}
            lg={{ gap: '12' }}
            xl={{
                gap: '24',
            }}
        >
            <HeaderContainer>
                {conferenceDate ? (
                    // A kicker/byline above the h1, not a section heading — kept as
                    // a <p> so the page's heading order starts cleanly at h1 below
                    // (a screen-reader-visible h2 here, before the h1, previously
                    // broke heading hierarchy for AT users navigating by heading).
                    <styled.p
                        color="text.highlight"
                        fontSize={{ base: 'md', md: 'xl' }}
                        fontWeight={{ base: 'medium', md: 'semibold' }}
                        display="flex"
                        flexDirection={{ base: 'column', xs: 'row' }}
                        justifyContent="space-between"
                        gap={{ base: '1', xs: '4' }}
                        width="full"
                    >
                        <styled.span>
                            {conferenceDayStart(conferenceDate).toLocaleString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </styled.span>
                        {venue ? (
                            <AppLink
                                to="/venue"
                                unstyled
                                color="inherit"
                                textDecoration="underline"
                                textDecorationThickness="1px"
                                textUnderlineOffset="0.2em"
                                _hover={{ color: 'text.primary' }}
                            >
                                {venue.name}
                            </AppLink>
                        ) : null}
                    </styled.p>
                ) : null}
                <styled.h1
                    fontFamily="display"
                    color="text.primary"
                    w="full"
                    fontWeight="black"
                    textWrap="balance"
                    lineHeight="[1.2]"
                    fontSize={{ base: '2xl', md: '3xl', xl: '5xl' }}
                    maxWidth={{ base: 'full', xl: '3/4' }}
                >
                    A one day, fully inclusive, approachable and affordable tech conference for everyone.
                </styled.h1>
            </HeaderContainer>
            <Box width="full" position="relative" maxHeight={{ base: '35', md: '50', lg: '65', xl: '105' }}>
                {/* Sizing element: the front mark establishes the container height.
                    Other Ds and the gradient overlay are absolutely positioned over it. */}
                <Box width="[38%]" ml="[4%]" visibility="hidden" aria-hidden="true">
                    <FrontMark style={{ width: '100%', height: 'auto' }} />
                </Box>
                <Box
                    position="absolute"
                    zIndex="base"
                    bottom="0"
                    bgGradient="to-b"
                    gradientFrom="transparent"
                    gradientTo="gradient.hero-end"
                    width="full"
                    height="3/5"
                ></Box>
                {/*
                 * Each parallax D carries a vertical fade mask + opacity so
                 * its lower edge dissolves into whatever surface sits below.
                 * The mask + opacity sit on the element that translates, so
                 * they travel with the SVG as it drifts on scroll.
                 */}
                <div style={{ position: 'absolute', top: '0', left: '4%', zIndex: 2, width: '38%', opacity: 0.7, ...DRIFT_MASK }}>
                    <FrontMark style={{ width: '100%', height: 'auto' }} />
                </div>
                <div
                    ref={middleRef}
                    style={{
                        position: 'absolute',
                        top: '0',
                        marginTop: '20px',
                        left: '30%',
                        zIndex: 1,
                        width: '38%',
                        opacity: 0.7,
                        ...DRIFT_MASK,
                    }}
                >
                    <MiddleMark style={{ width: '100%', height: 'auto' }} />
                </div>
                <div
                    ref={backRef}
                    style={{
                        position: 'absolute',
                        top: '0',
                        marginTop: '40px',
                        left: '56%',
                        width: '38%',
                        opacity: 0.7,
                        ...DRIFT_MASK,
                    }}
                >
                    <BackMark style={{ width: '100%', height: 'auto' }} />
                </div>
            </Box>
        </Flex>
    )
}

/**
 * Translates the element down by `distance` px as the page scrolls through the
 * first PARALLAX_SCROLL_RANGE px, eased with CSS `ease-out`.
 *
 * Written to `style.transform` directly rather than scrubbing a paused Web
 * Animation: Playwright's screenshot `animations: 'disabled'` fast-forwards
 * finite Web Animations to their end state, which put the Ds at full drift in
 * the visual baselines.
 */
function useScrollDrift(distance: number) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const element = ref.current
        if (!element) return

        let frame = 0
        const update = () => {
            frame = 0
            const progress = Math.min(Math.max(window.scrollY, 0), PARALLAX_SCROLL_RANGE) / PARALLAX_SCROLL_RANGE
            element.style.transform = `translateY(${easeOut(progress) * distance}px)`
        }
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update)
        }

        update()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => {
            window.removeEventListener('scroll', onScroll)
            cancelAnimationFrame(frame)
        }
    }, [distance])

    return ref
}

// cubic-bezier(0, 0, 0.58, 1), the CSS `ease-out` curve, solved for x by bisection.
function easeOut(x: number) {
    if (x <= 0) return 0
    if (x >= 1) return 1
    const bezier = (t: number, p1: number, p2: number) => 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3
    let lo = 0
    let hi = 1
    for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2
        if (bezier(mid, 0, 0.58) < x) lo = mid
        else hi = mid
    }
    return bezier((lo + hi) / 2, 0, 1)
}

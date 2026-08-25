import { Box, HStack, styled, VStack } from '~/styled-system/jsx'

interface TalkOptionCardProps {
    title: string
    description: string | null
    tags: string[]
    onClick?: () => void
    highlight?: boolean
}

export function TalkOptionCard({ title, description, tags, onClick, highlight }: TalkOptionCardProps) {
    // Create a unique prefix for this card to avoid key conflicts
    const cardId = title.replace(/\s+/g, '-').toLowerCase()

    return (
        // NOTE ON COLOURS: this card forces a light surface in both themes, so
        // every colour on it must come from a *theme-invariant* token scale.
        //
        // `admin.50`-`admin.900` and `status.*` are defined identically in
        // `conference/theme/perth.theme.ts` and `perth-light.theme.ts`, so they
        // resolve to the same value under either theme — which is exactly the
        // contract a forced-light surface needs. The theme-reactive scales
        // (`gray.*`, `indigo.*`, `text.*`, `interactive.*`) must NOT be used
        // here: they invert with the theme while this background does not, and
        // that mismatch is what broke this card. `gray.7` resolved *light*
        // under the light theme (1.6:1 on white) and `indigo.1` resolved
        // *near-black* under the dark theme (3.03:1 behind `indigo.8` text).
        // Both were caught by the axe scan of the live voting flow, which only
        // became renderable once the Sessionize fixtures landed.
        //
        // If this card ever adopts a theme-reactive surface, switch the whole
        // set back to the reactive semantic tokens together — never a mix.
        //
        // A native <button> (rather than a div+onClick) so the card is
        // keyboard-focusable and operable with Enter/Space out of the box —
        // it previously offered a mouse-only hover affordance (cursor,
        // lift-and-glow) with no keyboard equivalent and no focus style.
        <styled.button
            type="button"
            // `aria-disabled` rather than `disabled`: the voting page drops
            // `onClick` for ~200ms after a vote to prevent double-submits, and
            // a `disabled` button leaves the tab order — a keyboard user
            // focused on this card would silently lose their place mid-flow.
            // aria-disabled keeps it focusable and announced as unavailable.
            aria-disabled={!onClick}
            onClick={onClick}
            appearance="none"
            flex="1"
            width="full"
            textAlign="left"
            borderRadius="xl"
            borderWidth="2px"
            borderColor="admin.200"
            bg={highlight ? 'admin.100' : 'admin.50'}
            p="7"
            cursor={onClick ? 'pointer' : 'default'}
            shadow={highlight ? '2xl' : 'md'}
            style={{
                transition: 'all 0.1s',
            }}
            _hover={
                onClick
                    ? {
                          borderColor: 'admin.300',
                          transform: 'translateY(-3px) scale(1.02)',
                          shadow: 'xl',
                      }
                    : undefined
            }
            // `admin.900`, not `interactive.focus`: the focus colour is
            // theme-reactive, so on a forced-light surface the dark theme's
            // variant could land low-contrast against this background.
            // `[...]` is Panda's arbitrary-value escape hatch, needed because
            // `outline` is a composite shorthand with no matching token type.
            // `token(...)` still resolves through the design system, so this is
            // not a hardcoded colour.
            _focusVisible={{
                outline: '[3px solid token(colors.admin.900)]',
                outlineOffset: '[2px]',
            }}
            _disabled={{ cursor: 'default' }}
        >
            <VStack gap="4">
                {/* A <button> can only contain phrasing content, so this stays
                    a styled paragraph rather than a heading element (which
                    would be invalid nested inside the button). */}
                <styled.p fontSize="xl" color="admin.900" fontWeight="bold" textAlign="center">
                    {title}
                </styled.p>

                {description && (
                    <Box
                        color="admin.700"
                        fontSize="md"
                        lineHeight="relaxed"
                        fontWeight="medium"
                        whiteSpace="pre-wrap"
                        style={{
                            // Remove truncation, show full abstract
                            overflow: 'visible',
                            display: 'block',
                        }}
                    >
                        {description.trim()}
                    </Box>
                )}

                <HStack gap="2" flexWrap="wrap" mt="2">
                    {tags.map((tag, index) => (
                        <Box
                            key={`${cardId}-tag-${index}-${tag}`}
                            px="3"
                            py="1"
                            // `status.info.*`, not `indigo.*`: the indigo scale
                            // inverts under the dark theme (see the note above),
                            // while the status scale is theme-invariant. Gives
                            // the same blue-tinted chip at 9.5:1.
                            bg="status.info.bg"
                            color="status.info.fg"
                            borderRadius="full"
                            borderWidth="1px"
                            borderColor="status.info.border"
                            fontSize="sm"
                            fontWeight="semibold"
                            shadow="sm"
                        >
                            {tag}
                        </Box>
                    ))}
                </HStack>
            </VStack>
        </styled.button>
    )
}

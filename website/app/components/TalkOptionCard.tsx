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
        // COLOURS: this card looks the same in both themes, so every colour on
        // it comes from a theme-invariant token scale — `admin.50`-`admin.900`
        // and `status.*`, which are defined identically in
        // `conference/theme/perth.theme.ts` and `perth-light.theme.ts`. The
        // admin scale runs light-to-dark, so the card reads as a light card
        // either way: a voting comparison is a focused reading task and the
        // pair should look the same whichever theme the visitor chose.
        //
        // Do NOT use the theme-reactive scales (`gray.*`, `indigo.*`, `text.*`,
        // `interactive.*`) here — they invert with the theme while this
        // surface does not, which puts light text on a near-white card (or the
        // reverse). `talk-option-card.theme-invariant.test.ts` enforces this
        // statically; `e2e/voting.spec.ts` scans the rendered card with axe in
        // both themes. If the card ever becomes theme-reactive, move the whole
        // set to reactive tokens together — never a mix — and delete that test
        // along with this note.
        //
        // A native <button> rather than a div+onClick, so the card is
        // keyboard-focusable and operable with Enter/Space out of the box.
        <styled.button
            type="button"
            // `aria-disabled` rather than `disabled`: the voting page drops
            // `onClick` for ~200ms after a vote to prevent double-submits, and
            // a `disabled` button leaves the tab order — a keyboard user would
            // silently lose their place mid-flow. `aria-disabled` keeps the
            // card focusable while announcing it as unavailable.
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
            // `admin.900`, not the theme-reactive `interactive.focus`. `[...]`
            // is Panda's arbitrary-value escape hatch, needed because `outline`
            // is a composite shorthand with no matching token type; `token(...)`
            // still resolves through the design system.
            _focusVisible={{
                outline: '[3px solid token(colors.admin.900)]',
                outlineOffset: '[2px]',
            }}
            _disabled={{ cursor: 'default' }}
        >
            <VStack gap="4">
                {/* A <button> may only contain phrasing content, so this is a
                    styled paragraph rather than a heading. */}
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
                            // `status.info.*`, not the theme-reactive `indigo.*`:
                            // same blue-tinted chip, 9.5:1 in both themes.
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

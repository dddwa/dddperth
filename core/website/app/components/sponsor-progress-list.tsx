import { AppLink } from '~/components/app-link'
import type { SectionProgress } from '~/lib/sponsors/progress'
import { Box, Flex, styled } from '~/styled-system/jsx'

/**
 * Per-section progress on the sponsor dashboard.
 *
 * Replaces the flat four-item checklist, which only covered the website
 * profile — so it read "All done" while the whole logistics form was still
 * untouched, and gave sponsors no reason to go there.
 *
 * Each row is a link: the dashboard is the map, and every incomplete section
 * is one click from the form that finishes it.
 */
export function SponsorProgressList({ sections }: { sections: SectionProgress[] }) {
    return (
        <Flex direction="column" gap="3">
            {sections.map((section) => {
                const state = section.complete ? 'complete' : section.notStarted ? 'not-started' : 'partial'

                return (
                    <AppLink
                        key={section.key}
                        to={section.href}
                        unstyled
                        display="block"
                        py="3"
                        px="4"
                        bg="white"
                        border="admin-subtle"
                        borderRadius="lg"
                        textDecoration="none"
                        transition="colors"
                        _hover={{ bg: 'admin.50', borderColor: 'admin.400' }}
                    >
                        <Flex align="center" gap="3" flexWrap="wrap">
                            <StatusIcon state={state} />
                            <styled.span fontSize="sm" fontWeight="medium" color="admin.900">
                                {section.label}
                            </styled.span>

                            {section.optional && (
                                <styled.span fontSize="xs" color="admin.600">
                                    optional
                                </styled.span>
                            )}

                            {/* The count is the point of this list — it's what
                                tells a sponsor a section is half-finished
                                rather than untouched. Only shown for
                                multi-item sections, where "1 of 1" would be
                                noise. */}
                            <styled.span
                                ml="auto"
                                fontSize="xs"
                                fontWeight={state === 'complete' ? 'semibold' : 'normal'}
                                color={state === 'complete' ? 'status.success.fg' : 'admin.600'}
                            >
                                {state === 'complete'
                                    ? 'Complete'
                                    : section.total > 1
                                      ? `${section.done} of ${section.total} done`
                                      : state === 'not-started'
                                        ? 'Not started'
                                        : 'In progress'}
                            </styled.span>
                            <Chevron />
                        </Flex>

                        {!section.complete && section.total > 1 && (
                            <Box mt="2" ml="8" h="1.5" borderRadius="full" bg="admin.200" overflow="hidden">
                                <Box
                                    h="full"
                                    borderRadius="full"
                                    bg="admin.700"
                                    style={{ width: `${Math.round((section.done / section.total) * 100)}%` }}
                                />
                            </Box>
                        )}
                    </AppLink>
                )
            })}
        </Flex>
    )
}

/** Decorative: the status is also spelled out in text at the end of the row. */
function StatusIcon({ state }: { state: 'complete' | 'partial' | 'not-started' }) {
    if (state === 'complete') {
        return (
            <styled.svg aria-hidden="true" viewBox="0 0 20 20" w="5" h="5" flexShrink="0" color="status.success.fg">
                <circle cx="10" cy="10" r="10" fill="currentColor" />
                <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </styled.svg>
        )
    }

    return (
        <styled.svg aria-hidden="true" viewBox="0 0 20 20" w="5" h="5" flexShrink="0" color="admin.500">
            <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            {state === 'partial' && <path d="M10 1a9 9 0 0 1 0 18z" fill="currentColor" />}
        </styled.svg>
    )
}

function Chevron() {
    return (
        <styled.svg aria-hidden="true" viewBox="0 0 20 20" w="4" h="4" flexShrink="0" color="admin.500">
            <path d="M7.5 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </styled.svg>
    )
}

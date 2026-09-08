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
                        p="3"
                        borderRadius="md"
                        textDecoration="none"
                        bg={section.complete ? 'status.success.bg' : 'admin.100'}
                        _hover={{ opacity: 0.85 }}
                    >
                        <Flex align="center" gap="3" flexWrap="wrap">
                            <styled.span fontSize="lg" aria-hidden>
                                {section.complete ? '✅' : '⬜️'}
                            </styled.span>
                            <styled.span
                                fontSize="sm"
                                fontWeight="medium"
                                color={section.complete ? 'status.success.fg' : 'admin.900'}
                            >
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
                            <styled.span ml="auto" fontSize="xs" color="admin.600">
                                {state === 'complete'
                                    ? 'Complete'
                                    : section.total > 1
                                      ? `${section.done} of ${section.total} done`
                                      : state === 'not-started'
                                        ? 'Not started'
                                        : 'In progress'}
                            </styled.span>
                        </Flex>

                        {!section.complete && section.total > 1 && (
                            <Box mt="2" h="1.5" borderRadius="full" bg="admin.200" overflow="hidden">
                                <Box
                                    h="full"
                                    borderRadius="full"
                                    bg="admin.900"
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

import { css } from '~/styled-system/css'
import { Box, HStack, styled, VStack } from '~/styled-system/jsx'

interface TalkOptionCardProps {
    title: string
    description: string | null
    tags: string[]
    onClick?: () => void
    highlight?: boolean
}

export function TalkOptionCard({ title, description, tags, onClick, highlight }: TalkOptionCardProps) {
    return (
        <Box
            flex={1}
            className={css({
                borderRadius: 'xl',
                border: '2px solid',
                borderColor: highlight ? 'blue.400' : 'gray.300',
                bg: 'white',
                p: 7,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: highlight ? '2xl' : 'md',
                _hover: onClick
                    ? {
                          borderColor: highlight ? 'blue.500' : 'gray.400',
                          transform: 'translateY(-3px) scale(1.02)',
                          boxShadow: 'xl',
                      }
                    : undefined,
            })}
            onClick={onClick}
        >
            <VStack gap={4}>
                <styled.h3 fontSize="xl" color="gray.900" fontWeight="bold" textAlign="center">
                    {title}
                </styled.h3>

                {description && (
                    <Box
                        color="gray.700"
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

                <HStack gap={2} flexWrap="wrap" mt={2}>
                    {tags.map((tag) => (
                        <Box
                            key={tag}
                            className={css({
                                px: 3,
                                py: 1,
                                bg: 'gray.100',
                                color: 'gray.800',
                                borderRadius: 'full',
                                border: '1px solid',
                                borderColor: 'gray.300',
                                fontSize: 'sm',
                                fontWeight: 'semibold',
                                boxShadow: 'sm',
                            })}
                        >
                            {tag}
                        </Box>
                    ))}
                </HStack>
            </VStack>
        </Box>
    )
}

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
        <Box
            flex="1"
            borderRadius="xl"
            borderWidth="2px"
            borderColor="gray.3"
            bg={highlight ? 'gray.2' : 'white'}
            p="7"
            cursor={onClick ? 'pointer' : 'default'}
            shadow={highlight ? '2xl' : 'md'}
            onClick={onClick}
            style={{
                transition: 'all 0.1s',
            }}
            _hover={onClick
                    ? {
                          borderColor: 'gray.4',
                          transform: 'translateY(-3px) scale(1.02)',
                          shadow: 'xl',
                      }
                    : undefined}
        >
            <VStack gap="4">
                <styled.h3 fontSize="xl" color="gray.9" fontWeight="bold" textAlign="center">
                    {title}
                </styled.h3>

                {description && (
                    <Box
                        color="gray.7"
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
                            bg="indigo.1"
                            color="indigo.8"
                            borderRadius="full"
                            borderWidth="1px"
                            borderColor="indigo.3"
                            fontSize="sm"
                            fontWeight="semibold"
                            shadow="sm"
                        >
                            {tag}
                        </Box>
                    ))}
                </HStack>
            </VStack>
        </Box>
    )
}

import { useEffect, useRef, useState } from 'react'
import { Box, Flex, styled } from '~/styled-system/jsx'

/**
 * Checkbox-dropdown filter used across the agenda table.
 *
 * Selecting nothing means "no filter" rather than "match nothing", so an empty
 * selection always shows every row. Values within one filter are OR'd by the
 * caller; separate filters are AND'd.
 */

export interface MultiSelectOption {
    value: string
    label: string
}

export function MultiSelectFilter({
    label,
    values,
    options,
    onChange,
    /** Renders the label above the control (top filter bar) vs inline (column header). */
    showLabel = false,
    minWidth = '[150px]',
    fontSize = 'xs',
}: {
    label: string
    values: string[]
    options: MultiSelectOption[]
    onChange: (values: string[]) => void
    showLabel?: boolean
    minWidth?: `[${string}]`
    fontSize?: 'xs' | 'sm'
}) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on outside click / Escape so the panel behaves like a real menu.
    useEffect(() => {
        if (!open) return

        function onPointerDown(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false)
        }

        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    function toggle(value: string) {
        onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])
    }

    const selectedLabels = options.filter((o) => values.includes(o.value)).map((o) => o.label)
    const summary =
        selectedLabels.length === 0
            ? 'All'
            : selectedLabels.length === 1
              ? selectedLabels[0]
              : `${selectedLabels.length} selected`

    return (
        <Box ref={containerRef} position="relative">
            {showLabel && (
                <styled.p fontSize="xs" fontWeight="medium" color="admin.600" mb="1">
                    {label}
                </styled.p>
            )}
            <styled.button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={`${label} filter${selectedLabels.length ? `: ${selectedLabels.join(', ')}` : ''}`}
                title={selectedLabels.length ? selectedLabels.join(', ') : `Filter by ${label}`}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap="1"
                width="full"
                minW={minWidth}
                bg="white"
                border="admin-subtle"
                borderRadius="sm"
                px="2"
                py="1"
                fontSize={fontSize}
                fontWeight="normal"
                textAlign="left"
                cursor="pointer"
                color={selectedLabels.length ? 'indigo.7' : 'admin.700'}
            >
                <styled.span overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {summary}
                </styled.span>
                <styled.span fontSize="2xs" flexShrink="0">
                    ▾
                </styled.span>
            </styled.button>

            {open && (
                <Box
                    position="absolute"
                    top="[100%]"
                    left="0"
                    mt="1"
                    zIndex="dropdown"
                    bg="white"
                    border="admin-subtle"
                    borderRadius="md"
                    boxShadow="lg"
                    minW="[220px]"
                    maxW="[320px]"
                    maxH="[300px]"
                    overflowY="auto"
                    p="1"
                >
                    {options.length === 0 ? (
                        <styled.p fontSize="xs" color="admin.500" p="2">
                            No options
                        </styled.p>
                    ) : (
                        <>
                            {options.map((option) => (
                                <styled.label
                                    key={option.value}
                                    display="flex"
                                    alignItems="center"
                                    gap="2"
                                    px="2"
                                    py="1"
                                    fontSize="xs"
                                    fontWeight="normal"
                                    borderRadius="sm"
                                    cursor="pointer"
                                    _hover={{ bg: 'admin.50' }}
                                >
                                    <styled.input
                                        type="checkbox"
                                        checked={values.includes(option.value)}
                                        onChange={() => toggle(option.value)}
                                        flexShrink="0"
                                    />
                                    <styled.span>{option.label}</styled.span>
                                </styled.label>
                            ))}
                            {values.length > 0 && (
                                <Flex justifyContent="flex-end" borderTop="admin-subtle" mt="1" pt="1">
                                    <styled.button
                                        type="button"
                                        onClick={() => onChange([])}
                                        fontSize="xs"
                                        color="prose.link"
                                        px="2"
                                        py="1"
                                        cursor="pointer"
                                        _hover={{ textDecoration: 'underline' }}
                                    >
                                        Clear
                                    </styled.button>
                                </Flex>
                            )}
                        </>
                    )}
                </Box>
            )}
        </Box>
    )
}

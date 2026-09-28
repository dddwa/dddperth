import { useId, useState, type FocusEvent } from 'react'
import { Button } from '~/components/ui/button'
import { Box, Flex, styled } from '~/styled-system/jsx'

/**
 * Read-only field for text an admin copies into an external mail client —
 * subject lines, email bodies, recipient lists. Selects itself on focus (so
 * a keyboard user can Ctrl+C straight away) and has a Copy button for
 * everyone else. `rows` > 1 renders a textarea.
 */
export function CopyField({ label, value, rows = 1 }: { label: string; value: string; rows?: number }) {
    const id = useId()
    const [copied, setCopied] = useState(false)

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard can be refused (permissions, insecure origin) — the
            // field still selects on focus, so copying by hand still works.
        }
    }

    const fieldProps = {
        id,
        readOnly: true,
        value,
        onFocus: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => e.currentTarget.select(),
        w: 'full',
        px: '3',
        py: '2',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'admin.400',
        borderRadius: 'md',
        fontSize: 'sm',
        bg: 'admin.50',
        color: 'admin.900',
    } as const

    return (
        <Box>
            <Flex justify="space-between" align="flex-end" gap="2" mb="1">
                <styled.label htmlFor={id} fontSize="sm" fontWeight="medium" color="admin.700">
                    {label}
                </styled.label>
                <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    color="admin.900"
                    borderColor="admin.400"
                    bg="white"
                    _hover={{ bg: 'admin.100' }}
                    onClick={() => void copy()}
                    disabled={!value}
                >
                    {copied ? 'Copied' : 'Copy'}
                    <styled.span srOnly> {label}</styled.span>
                </Button>
            </Flex>
            <styled.span role="status" srOnly>
                {copied ? `${label} copied` : ''}
            </styled.span>
            {rows > 1 ? (
                <styled.textarea {...fieldProps} rows={rows} fontFamily="mono" />
            ) : (
                <styled.input {...fieldProps} />
            )}
        </Box>
    )
}

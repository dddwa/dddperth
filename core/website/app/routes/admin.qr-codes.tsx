import { useId, useMemo, useState } from 'react'
import { useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import { qrFileName, qrMatrix, qrSvgDocument, resolveQrTarget, type QrMatrix } from '~/lib/qr-code'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.qr-codes'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const url = new URL(request.url)
    return { origin: url.origin, initial: url.searchParams.get('url') ?? '/' }
}

/** PNG downloads are rendered at this many pixels per side — big enough for a printed A4 sign. */
const PNG_SIZE = 1200

function download(href: string, fileName: string) {
    const link = document.createElement('a')
    link.href = href
    link.download = fileName
    link.click()
}

function downloadSvg(matrix: QrMatrix, url: string) {
    const blob = new Blob([qrSvgDocument(matrix)], { type: 'image/svg+xml' })
    const href = URL.createObjectURL(blob)
    download(href, `${qrFileName(url)}.svg`)
    URL.revokeObjectURL(href)
}

function downloadPng(matrix: QrMatrix, url: string) {
    const scale = Math.ceil(PNG_SIZE / matrix.size)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = matrix.size * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000'
    matrix.modules.forEach((row, y) =>
        row.forEach((dark, x) => {
            if (dark) ctx.fillRect(x * scale, y * scale, scale, scale)
        }),
    )
    download(canvas.toDataURL('image/png'), `${qrFileName(url)}.png`)
}

export default function QrCodesAdmin() {
    const { origin, initial } = useLoaderData<typeof loader>()
    const [input, setInput] = useState(initial)
    const inputId = useId()
    const hintId = useId()
    const statusId = useId()

    const target = useMemo(() => resolveQrTarget(input, origin), [input, origin])
    const matrix = useMemo(() => ('url' in target ? qrMatrix(target.url) : undefined), [target])

    return (
        <AdminLayout heading="QR codes">
            <AdminCard>
                <styled.label
                    htmlFor={inputId}
                    display="block"
                    fontSize="sm"
                    fontWeight="medium"
                    color="admin.700"
                    mb="1"
                >
                    URL or path
                </styled.label>
                <styled.input
                    id={inputId}
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    aria-describedby={`${hintId} ${statusId}`}
                    aria-invalid={'error' in target}
                    width="full"
                    px="3"
                    py="2"
                    border="admin-subtle"
                    borderRadius="md"
                    fontSize="sm"
                    _focus={{ outline: 'none', borderColor: 'indigo.7', boxShadow: 'focus-ring' }}
                />
                <styled.p id={hintId} fontSize="sm" color="admin.700" mt="1">
                    A path like <code>/survey/feedback</code> links to this site ({origin}); anything else needs a
                    full address.
                </styled.p>
                <styled.p id={statusId} aria-live="polite" fontSize="sm" mt="2" wordBreak="break-all">
                    {'error' in target ? (
                        <styled.span color="red.11">{target.error}</styled.span>
                    ) : (
                        <>
                            Encodes <strong>{target.url}</strong>
                        </>
                    )}
                </styled.p>
            </AdminCard>

            {matrix && 'url' in target ? (
                <AdminCard>
                    <Flex direction={{ base: 'column', md: 'row' }} gap="6" align={{ base: 'stretch', md: 'center' }}>
                        <Box width="full" maxW="xs" mx={{ base: 'auto', md: '0' }} border="admin-subtle">
                            <svg
                                viewBox={`0 0 ${matrix.size} ${matrix.size}`}
                                shapeRendering="crispEdges"
                                role="img"
                                aria-label={`QR code for ${target.url}`}
                                style={{ display: 'block', width: '100%', height: 'auto' }}
                            >
                                <rect width={matrix.size} height={matrix.size} fill="#fff" />
                                <path d={matrix.path} fill="#000" />
                            </svg>
                        </Box>
                        <Flex direction="column" gap="3" align="flex-start">
                            <Button type="button" onClick={() => downloadPng(matrix, target.url)}>
                                Download PNG
                            </Button>
                            <Button type="button" variant="outline" onClick={() => downloadSvg(matrix, target.url)}>
                                Download SVG
                            </Button>
                            <styled.p fontSize="sm" color="admin.700" maxW="sm">
                                SVG scales to any size without blurring, so prefer it for print. Scan the code with
                                your phone before sending it to the printer.
                            </styled.p>
                        </Flex>
                    </Flex>
                </AdminCard>
            ) : null}
        </AdminLayout>
    )
}

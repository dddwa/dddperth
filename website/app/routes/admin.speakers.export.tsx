import { conferenceManifest } from '@conference/manifest'
import { zipSync, type Zippable } from 'fflate'
import { requireAdmin } from '~/lib/auth.server'
import { buildSessionExport, collectPhotoSpeakers, slugifyName } from '~/lib/speakers/session-export'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/admin.speakers.export'

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}

/** ZIP of accepted + backup session details (title, description, speaker
 * names/taglines/bios) as JSON, plus every speaker's photo — for handing
 * off to design/print. Photos are fetched from Sessionize at request time
 * rather than cached, so this can be slow with a lot of speakers. */
export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const portalConfig = conferenceManifest.speakerPortal
    if (!portalConfig) {
        throw new Response('Speaker portal not configured', { status: 404 })
    }

    const speakers = await services.speakers.listSpeakers(portalConfig.year)
    const sessions = buildSessionExport(speakers)
    const photoSpeakers = collectPhotoSpeakers(sessions, speakers)

    const photoFiles = await Promise.all(
        photoSpeakers.map(async (speaker) => {
            try {
                const response = await fetch(speaker.profilePictureUrl)
                if (!response.ok) return null

                const contentType = response.headers.get('content-type')?.split(';')[0]?.trim()
                const extension = (contentType && EXTENSION_BY_CONTENT_TYPE[contentType]) ?? 'jpg'
                const bytes = new Uint8Array(await response.arrayBuffer())

                return {
                    path: `photos/${speaker.sessionizeId}-${slugifyName(speaker.fullName)}.${extension}`,
                    bytes,
                }
            } catch {
                return null
            }
        }),
    )

    const zipEntries: Zippable = {
        'sessions.json': new TextEncoder().encode(JSON.stringify(sessions, null, 2)),
    }
    for (const file of photoFiles) {
        if (file) zipEntries[file.path] = file.bytes
    }

    const zipped = zipSync(zipEntries)

    return new Response(zipped, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="speaker-export-${portalConfig.year}.zip"`,
        },
    })
}

import { conferenceManifest } from '@conference/manifest'
import { useLoaderData } from 'react-router'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { SpeakerWorkspaceView } from '~/components/speaker-workspace-view'
import { requireAdmin } from '~/lib/auth.server'
import { toWorkspaceView } from '~/lib/speakers/workspace-view.server'
import { getServices } from '~/remix-app-load-context'
import { Box, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.speakers.$sessionizeId'

/**
 * Read-only admin preview of exactly what a speaker sees at /speaker-portal
 * — same data, same `SpeakerWorkspaceView` component, no write access.
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const workspace = await services.speakers.getWorkspace(params.sessionizeId)
    if (!workspace) {
        throw new Response('Not Found', { status: 404 })
    }

    return {
        fullName: workspace.speaker.fullName,
        ...toWorkspaceView(workspace),
        infoPackUrl: conferenceManifest.speakerPortal?.infoPackUrl,
    }
}

export default function AdminSpeakerPreview() {
    const { fullName, sessionizeId, sessions, infoPackUrl } = useLoaderData<typeof loader>()

    return (
        <AdminLayout heading={`Speaker preview — ${fullName}`}>
            <Box mb="4">
                <AppLink to="/admin/speakers" color="admin.700" textDecoration="underline" fontSize="sm">
                    ← Back to speakers
                </AppLink>
            </Box>
            <Box mb="6" p="3" bg="status.info.bg" borderRadius="md" fontSize="sm" color="status.info.fg">
                This is a read-only preview of exactly what <styled.strong>{fullName}</styled.strong> sees when they
                log into the speaker portal.
            </Box>
            <SpeakerWorkspaceView sessionizeId={sessionizeId} sessions={sessions} infoPackUrl={infoPackUrl} />
        </AdminLayout>
    )
}

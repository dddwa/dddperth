import { conferenceManifest } from '@conference/manifest'
import { requireAdmin } from '~/lib/auth.server'
import { findCompetition } from '~/lib/competitions/competition-entry'
import { buildCompetitionWorkbook } from '~/lib/competitions/competition-workbook'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/admin.competitions_.export'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const competition = findCompetition(
        conferenceManifest.competitions,
        new URL(request.url).searchParams.get('slug') ?? undefined,
    )
    if (!competition) throw new Response('Not Found', { status: 404 })

    const entries = await getServices(context).competitions.listEntries(competition.slug)
    return new Response(buildCompetitionWorkbook(entries), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="competition-${competition.slug}.xlsx"`,
            'Cache-Control': 'no-store',
        },
    })
}

import { conferenceManifest } from '@conference/manifest'
import { requireAdmin } from '~/lib/auth.server'
import { loadFeedbackReport, resolveFeedbackYear } from '~/lib/feedback/feedback-report.server'
import { buildFeedbackWorkbook } from '~/lib/feedback/feedback-workbook'
import type { Route } from './+types/admin.feedback_.export'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const year = resolveFeedbackYear(context, new URL(request.url).searchParams.get('year'))
    const report = await loadFeedbackReport(context, year)

    return new Response(buildFeedbackWorkbook(report, conferenceManifest.public.timezone), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="feedback-${year}.xlsx"`,
            'Cache-Control': 'no-store',
        },
    })
}

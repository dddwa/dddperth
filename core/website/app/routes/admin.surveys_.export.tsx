import { conferenceManifest } from '@conference/manifest'
import { requireAdmin } from '~/lib/auth.server'
import { findSurvey } from '~/lib/surveys/survey-response'
import { buildSurveyWorkbook } from '~/lib/surveys/survey-workbook'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/admin.surveys_.export'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const survey = findSurvey(conferenceManifest.surveys, new URL(request.url).searchParams.get('slug') ?? undefined)
    if (!survey) throw new Response('Not Found', { status: 404 })

    const responses = await getServices(context).surveys.listResponses(survey.slug)
    return new Response(buildSurveyWorkbook(survey, responses), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="survey-${survey.slug}.xlsx"`,
            'Cache-Control': 'no-store',
        },
    })
}

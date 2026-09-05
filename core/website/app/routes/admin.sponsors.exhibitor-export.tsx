import { conferenceManifest } from '@conference/manifest'
import { utils as sheetUtils, write as writeWorkbook } from 'xlsx'
import { requireAdmin } from '~/lib/auth.server'
import { isConferenceYear } from '~/lib/get-year-config.server'
import { buildExhibitorSheet, type ExhibitorSource } from '~/lib/sponsors/exhibitor-export'
import type { ExhibitorLogistics } from '~/lib/sponsors/jira-client.server'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/admin.sponsors.exhibitor-export'

/**
 * The venue's "Supplier & Exhibitor List" as .xlsx.
 *
 * Names come from D1; logistics are read live from Jira, which isn't synced.
 * A Jira failure 502s rather than handing the venue a half-filled sheet.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const portalConfig = conferenceManifest.sponsorPortal
    if (!portalConfig) {
        throw new Response('Sponsor portal not configured', { status: 404 })
    }

    const sponsors = await services.sponsors.listSponsors(portalConfig.year)
    const activeSponsors = sponsors.filter((sponsor) => sponsor.active)

    let logistics: Map<string, ExhibitorLogistics>
    try {
        logistics = await services.sponsorSync.getExhibitorLogistics()
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Response(
            `Couldn't read exhibitor logistics from Jira, so the spreadsheet would be incomplete: ${message}`,
            { status: 502 },
        )
    }

    // The portal year is a plain string; the years map is keyed by a
    // template-literal type, so narrow before indexing.
    const conference = isConferenceYear(portalConfig.year)
        ? conferenceManifest.conferences.conferences[portalConfig.year]
        : undefined
    const conferenceDate =
        conference && conference.kind === 'conference' ? conference.conferenceDate?.toJSDate() : undefined

    // Jira wins (the committee edits it directly), falling back to the
    // portal if a push hasn't landed.
    const sources: ExhibitorSource[] = activeSponsors.map((sponsor) => {
        const fromJira = logistics.get(sponsor.issueKey) ?? {}
        const fromPortal = sponsor.profile?.logistics ?? {}
        const pick = (key: string) => fromJira[key] || fromPortal[key] || undefined

        return {
            companyName: sponsor.companyName,
            contactName: pick('exhibitorContactName'),
            contactPhone: pick('exhibitorContactPhone'),
            contactEmail: pick('exhibitorContactEmail'),
            bumpInSlot: pick('bumpInSlot'),
            bumpOutWindow: pick('bumpOutWindow'),
            parking: pick('parking'),
            equipmentList: pick('equipmentList'),
            trolleyOrForklift: pick('trolleyOrForklift'),
            loadingDockAssistance: pick('loadingDockAssistance'),
            // Portal-only — no Jira field, so it never appears in `fromJira`.
            additionalNotes: fromPortal.additionalNotes,
        }
    })

    const sheet = sheetUtils.aoa_to_sheet(
        buildExhibitorSheet({
            sources,
            conferenceName: conferenceManifest.public.name,
            conferenceDate,
        }),
    )
    const workbook = sheetUtils.book_new()
    sheetUtils.book_append_sheet(workbook, sheet, 'Exhibitor List')

    const bytes = writeWorkbook(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

    return new Response(bytes, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="exhibitor-list-${portalConfig.year}.xlsx"`,
        },
    })
}

import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { data, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import {
    buildFollowUpRow,
    followUpEmail,
    needsFollowUp,
    sectionChaseEmail,
    sortForFollowUp,
    type FollowUpRow,
} from '~/lib/sponsors/follow-up'
import { logisticsVisibility } from '~/lib/sponsors/logistics'
import type { SectionKey, SectionProgress } from '~/lib/sponsors/progress'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.sponsors_.follow-up'

/** Same mapping the portal uses, so the admin sees the sections the sponsor sees. */
function mappedTier(rawTier: string): string | undefined {
    return conferenceManifest.sponsorPortal?.jira.tierMap?.[rawTier]
}

const CHASE_SECTIONS: SectionKey[] = ['profile', 'exhibition', 'screens', 'raffle', 'social', 'meetTheExperts']

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = await requireAdmin(request, context)
    const services = getServices(context)

    const portalConfig = conferenceManifest.sponsorPortal
    if (!portalConfig) return data({ configured: false as const })

    const [sponsors, registrations, assetTracking] = await Promise.all([
        services.sponsors.listSponsors(portalConfig.year),
        services.meetTheExperts.listRegistrations(),
        services.sponsorSync.getAssetTracking(),
    ])

    const respondedSponsors = new Set(
        registrations.filter((r) => r.registrantType === 'sponsor').map((r) => r.registrantId),
    )
    const meetTheExpertsOffered = (conferenceManifest.meetTheExperts?.slots ?? []).length > 0

    const rows = sortForFollowUp(
        sponsors
            .filter((sponsor) => sponsor.active)
            .map((sponsor) =>
                buildFollowUpRow({
                    sponsor,
                    visibility: logisticsVisibility(mappedTier(sponsor.tier)),
                    meetTheExpertsResponded: respondedSponsors.has(sponsor.issueKey),
                    meetTheExpertsOffered,
                    assets: assetTracking === null ? null : assetTracking.get(sponsor.issueKey),
                }),
            ),
    )

    const emailContext = {
        conferenceName: conferenceManifest.public.name,
        portalUrl: `${new URL(request.url).origin}/portal`,
        senderName: user.name || undefined,
    }

    return data({
        configured: true as const,
        year: portalConfig.year,
        jiraBaseUrl: portalConfig.jira.baseUrl,
        assetsKnown: assetTracking !== null,
        rows: rows.map((row) => ({ ...row, email: followUpEmail(row, emailContext) })),
        chase: CHASE_SECTIONS.map((key) => sectionChaseEmail(rows, key, emailContext)).filter(
            (chase) => chase !== null,
        ),
        summary: summarise(rows),
    })
}

/** Per section: how many sponsors it applies to, and how many are done. */
function summarise(rows: FollowUpRow[]) {
    const bySection = new Map<SectionKey, { label: string; applicable: number; complete: number; optional: boolean }>()
    for (const row of rows) {
        for (const section of row.sections) {
            const entry = bySection.get(section.key) ?? {
                label: section.label,
                applicable: 0,
                complete: 0,
                optional: section.optional,
            }
            entry.applicable++
            if (section.complete) entry.complete++
            bySection.set(section.key, entry)
        }
    }
    return {
        total: rows.length,
        usedPortal: rows.filter((row) => row.lastPortalSave !== undefined).length,
        allRequiredDone: rows.filter((row) => row.requiredOutstanding.length === 0).length,
        sections: [...bySection.values()],
    }
}

function formatDate(unixSeconds: number): string {
    return DateTime.fromSeconds(unixSeconds, { zone: conferenceManifest.public.timezone }).toLocaleString(
        { day: 'numeric', month: 'short' },
        { locale: 'en-AU' },
    )
}

const cell = { py: '3', pr: '4', verticalAlign: 'top' } as const

function Muted({ children }: { children: React.ReactNode }) {
    return (
        <styled.span color="admin.600" fontSize="xs">
            {children}
        </styled.span>
    )
}

function Missing({ children }: { children: React.ReactNode }) {
    return (
        <styled.span color="status.danger.fg" fontWeight="medium">
            {children}
        </styled.span>
    )
}

function SectionCell({ section }: { section: SectionProgress | undefined }) {
    if (!section) return <Muted>n/a</Muted>
    if (section.complete) return <span>✅</span>
    return (
        <Box>
            {section.optional ? (
                <span>Not answered</span>
            ) : (
                <Missing>{section.done === 0 ? 'Not started' : `${section.done}/${section.total}`}</Missing>
            )}
            {!section.optional && section.done > 0 && (
                <Box mt="1">
                    <Muted>Missing: {section.missing.join(', ')}</Muted>
                </Box>
            )}
        </Box>
    )
}

type LoadedRow = FollowUpRow & { email: string | null }

function FollowUpTableRow({
    row,
    jiraBaseUrl,
    assetsKnown,
}: {
    row: LoadedRow
    jiraBaseUrl: string
    assetsKnown: boolean
}) {
    const section = (key: SectionKey) => row.sections.find((s) => s.key === key)
    const exhibition = section('exhibition')

    return (
        <styled.tr borderBottom="admin-subtle" color="admin.900">
            <styled.td {...cell}>
                <AppLink
                    unstyled
                    to={`${jiraBaseUrl}/browse/${row.issueKey}`}
                    textDecoration="underline"
                    fontWeight="medium"
                >
                    {row.companyName}
                </AppLink>
                <Box>
                    <Muted>
                        {row.tier} · {row.issueKey}
                    </Muted>
                </Box>
            </styled.td>
            <styled.td {...cell}>
                {row.lastPortalSave !== undefined ? (
                    <span>Saved {formatDate(row.lastPortalSave)}</span>
                ) : (
                    <Missing>Never</Missing>
                )}
            </styled.td>
            <styled.td {...cell}>
                <SectionCell section={section('profile')} />
            </styled.td>
            <styled.td {...cell}>
                {!exhibition ? (
                    <Muted>n/a</Muted>
                ) : (
                    <Box>
                        <Box>In: {row.answers.bumpInSlot ?? <Missing>not given</Missing>}</Box>
                        <Box>Out: {row.answers.bumpOutWindow ?? <Missing>not given</Missing>}</Box>
                        {!exhibition.complete && (
                            <Box mt="1">
                                <Muted>Missing: {exhibition.missing.join(', ')}</Muted>
                            </Box>
                        )}
                    </Box>
                )}
            </styled.td>
            <styled.td {...cell}>
                {!row.hasBooth ? <Muted>n/a</Muted> : (row.answers.screenOrders ?? <span>Not answered</span>)}
            </styled.td>
            <styled.td {...cell}>{row.answers.rafflePrize ?? <span>Not answered</span>}</styled.td>
            <styled.td {...cell}>
                <SectionCell section={section('social')} />
            </styled.td>
            <styled.td {...cell}>
                <SectionCell section={section('meetTheExperts')} />
            </styled.td>
            <styled.td {...cell}>
                {!assetsKnown || !row.assets.known ? (
                    <Muted>Unknown</Muted>
                ) : (
                    <Box>
                        <Box>{row.assets.videoRequired ? 'Video owed' : <Muted>No video</Muted>}</Box>
                        <Muted>{row.assets.status ?? 'No status in Jira'}</Muted>
                        {row.assets.uploadUrl && (
                            <Box mt="1">
                                <AppLink unstyled to={row.assets.uploadUrl} textDecoration="underline" fontSize="xs">
                                    Upload folder
                                </AppLink>
                            </Box>
                        )}
                    </Box>
                )}
            </styled.td>
            <styled.td {...cell}>
                {row.email ? (
                    <AppLink unstyled to={row.email} textDecoration="underline" whiteSpace="nowrap">
                        Email {row.companyName}
                    </AppLink>
                ) : row.contacts.length === 0 ? (
                    <Muted>No contacts</Muted>
                ) : (
                    <span>All done</span>
                )}
            </styled.td>
        </styled.tr>
    )
}

export default function AdminSponsorFollowUp() {
    const loaderData = useLoaderData<typeof loader>()

    if (!loaderData.configured) {
        return (
            <AdminLayout heading="Sponsor follow-up">
                <AdminCard>
                    <styled.p fontSize="sm" color="admin.700">
                        The sponsor portal isn't configured for this conference.
                    </styled.p>
                </AdminCard>
            </AdminLayout>
        )
    }

    const { year, rows, chase, summary, jiraBaseUrl, assetsKnown } = loaderData
    const outstanding = rows.filter(needsFollowUp)

    return (
        <AdminLayout heading={`Sponsor follow-up (${year})`} fullWidth>
            <styled.p fontSize="sm" color="admin.600" mb="6">
                <AppLink unstyled to="/admin/sponsors" textDecoration="underline">
                    ← Back to sponsors
                </AppLink>
            </styled.p>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                    Where things are at
                </styled.h2>
                <Flex gap="4" flexWrap="wrap">
                    <Stat label="Have used the portal" value={`${summary.usedPortal} of ${summary.total}`} />
                    <Stat
                        label="Everything required supplied"
                        value={`${summary.allRequiredDone} of ${summary.total}`}
                    />
                    {summary.sections.map((section) => (
                        <Stat
                            key={section.label}
                            label={`${section.label}${section.optional ? ' (optional)' : ''}`}
                            value={`${section.complete} of ${section.applicable}`}
                        />
                    ))}
                </Flex>
            </AdminCard>

            {chase.length > 0 && (
                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Chase one topic
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600" mb="4">
                        One email to every sponsor missing that section, with contacts in BCC.
                    </styled.p>
                    <Flex gap="3" flexWrap="wrap">
                        {chase.map((item) => (
                            <AppLink
                                key={item.label}
                                unstyled
                                to={item.url}
                                fontSize="sm"
                                py="2"
                                px="3"
                                borderRadius="md"
                                border="admin-subtle"
                                bg="admin.100"
                                color="admin.900"
                                textDecoration="none"
                                _hover={{ bg: 'admin.200' }}
                            >
                                {item.label} ({item.sponsorCount} sponsor{item.sponsorCount === 1 ? '' : 's'})
                            </AppLink>
                        ))}
                    </Flex>
                </AdminCard>
            )}

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Hit list
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600" mb="4">
                    {outstanding.length} of {rows.length} sponsors have something outstanding. Most to chase first.
                    Answers include what the committee entered in Jira. Each email link opens a draft listing that
                    sponsor's missing items — edit before sending.
                </styled.p>
                {!assetsKnown && (
                    <Box mb="4" p="3" bg="status.warning.bg" borderRadius="md" fontSize="sm" color="status.warning.fg">
                        Couldn't read asset status from Jira, so the Assets column is blank. Everything else is current
                        as of the last sync.
                    </Box>
                )}
                <Box overflowX="auto">
                    <styled.table w="full" fontSize="sm">
                        <styled.thead>
                            <styled.tr textAlign="left" color="admin.600" borderBottom="admin-subtle">
                                <styled.th {...cell}>Sponsor</styled.th>
                                <styled.th {...cell}>Portal</styled.th>
                                <styled.th {...cell}>Profile</styled.th>
                                <styled.th {...cell}>Bump in / out</styled.th>
                                <styled.th {...cell}>TV screens</styled.th>
                                <styled.th {...cell}>Raffle prize</styled.th>
                                <styled.th {...cell}>Social quote</styled.th>
                                <styled.th {...cell}>Meet the Experts</styled.th>
                                <styled.th {...cell}>Assets (Jira)</styled.th>
                                <styled.th {...cell}>Follow up</styled.th>
                            </styled.tr>
                        </styled.thead>
                        <styled.tbody>
                            {rows.map((row) => (
                                <FollowUpTableRow
                                    key={row.issueKey}
                                    row={row}
                                    jiraBaseUrl={jiraBaseUrl}
                                    assetsKnown={assetsKnown}
                                />
                            ))}
                        </styled.tbody>
                    </styled.table>
                </Box>
                <styled.p fontSize="xs" color="admin.600" mt="4">
                    Videos and print artwork go to each sponsor's upload folder, which the portal can't see — the Assets
                    column is the committee's own "Asset Creation Status" in Jira. Open the sponsor's upload folder to
                    check what has actually arrived.
                </styled.p>
            </AdminCard>
        </AdminLayout>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <Box p="3" borderRadius="md" bg="admin.100" minW="40">
            <styled.p fontSize="lg" fontWeight="semibold" color="admin.900">
                {value}
            </styled.p>
            <styled.p fontSize="xs" color="admin.600">
                {label}
            </styled.p>
        </Box>
    )
}

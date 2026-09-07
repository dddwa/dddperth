import { useState, type ReactNode } from 'react'
import { data, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import {
    dropzoneClass,
    FieldError,
    fieldLabelClass,
    inputClass,
    PrimaryButton,
} from '~/components/portal-form'
import { PortalSavedBanner } from '~/components/portal-saved-banner'
import { requireSponsorContact } from '~/lib/auth.server'
import { parseFormData } from '~/lib/forms/parse-form.server'
import { conferenceManifest } from '@conference/manifest'
import { logisticsVisibility } from '~/lib/sponsors/logistics'
import { nextIncompleteSection, sponsorProgress } from '~/lib/sponsors/progress'
import {
    isProfileComplete,
    LOGO_MAX_BYTES,
    logoExtensionForContentType,
    profileDetailsSchema,
    SOCIAL_PLATFORMS,
    socialsFromForm,
    validateLogoUpload,
} from '~/lib/sponsors/profile'
import { getServices } from '~/remix-app-load-context'
import type { AppServices } from '~/lib/services/app-services'
import type { SponsorRecord } from '~/lib/services/sponsors-store'
import { css } from '~/styled-system/css'
import { Box, Flex, Grid, styled } from '~/styled-system/jsx'
import type { Route } from './+types/portal.profile'

export async function loader({ request, context }: Route.LoaderArgs) {
    const { sponsor } = await requireSponsorContact(request, context)
    const services = getServices(context)
    const profile = await services.sponsors.getProfile(sponsor.issueKey)
    const meetTheExpertsRegistration = await services.meetTheExperts.getRegistration('sponsor', sponsor.issueKey)

    // Drives the "next up" link in the post-save banner, so a sponsor is
    // always pointed at whatever they still owe us.
    const sections = sponsorProgress({
        profile,
        visibility: logisticsVisibility(conferenceManifest.sponsorPortal?.jira.tierMap?.[sponsor.tier]),
        meetTheExpertsResponded: Boolean(meetTheExpertsRegistration),
        meetTheExpertsOffered: (conferenceManifest.meetTheExperts?.slots ?? []).length > 0,
    })

    return {
        issueKey: sponsor.issueKey,
        nextSection: nextIncompleteSection(sections) ?? null,
        blurb: profile?.blurb ?? '',
        // Prefill from the Jira-synced website if the sponsor hasn't set one.
        websiteUrl: profile?.websiteUrl ?? sponsor.website ?? '',
        socials: profile?.socials ?? {},
        logo: profile?.logo
            ? { filename: profile.logo.filename, uploadedAt: profile.logo.uploadedAt, size: profile.logo.size }
            : null,
    }
}

/**
 * After any successful save, check whether the profile just became complete
 * and if so advance the Jira assets status field. The write-back is
 * best-effort — on Jira failure it's marked pending and the hourly sync
 * retries; the sponsor's save never fails because Jira is down.
 */
async function recordCompletionIfReady(services: AppServices, sponsor: SponsorRecord): Promise<void> {
    const profile = await services.sponsors.getProfile(sponsor.issueKey)
    if (!isProfileComplete(profile)) return

    await services.sponsors.markProfileCompleted(sponsor.issueKey)
    if (!sponsor.assetsTaskFlippedAt) {
        await services.sponsors.markAssetsTaskPending(sponsor.issueKey)
        await services.sponsorSync.flipAssetsTask(sponsor.issueKey)
    }
}

/**
 * The next outstanding section, recomputed *after* a save.
 *
 * The loader's value is stale by the time an action returns — it was computed
 * from the profile as it was before this save — so the banner would tell the
 * sponsor to go to the page they're already on.
 */
async function nextSectionAfterSave(services: AppServices, sponsor: SponsorRecord) {
    const [profile, meetTheExpertsRegistration] = await Promise.all([
        services.sponsors.getProfile(sponsor.issueKey),
        services.meetTheExperts.getRegistration('sponsor', sponsor.issueKey),
    ])

    const sections = sponsorProgress({
        profile,
        visibility: logisticsVisibility(conferenceManifest.sponsorPortal?.jira.tierMap?.[sponsor.tier]),
        meetTheExpertsResponded: Boolean(meetTheExpertsRegistration),
        meetTheExpertsOffered: (conferenceManifest.meetTheExperts?.slots ?? []).length > 0,
    })
    const next = nextIncompleteSection(sections)
    return next ? { label: next.label, href: next.href } : null
}

export async function action({ request, context }: Route.ActionArgs) {
    const { user, sponsor } = await requireSponsorContact(request, context)
    const services = getServices(context)

    const formData = await request.formData()
    const intent = formData.get('_action')

    if (intent === 'save-details') {
        const parsed = parseFormData(profileDetailsSchema, formData)
        if (!parsed.ok) {
            return data({ intent: 'save-details' as const, fieldErrors: parsed.fieldErrors }, { status: 400 })
        }

        await services.sponsors.saveDetails(
            sponsor.issueKey,
            {
                blurb: parsed.data.blurb,
                websiteUrl: parsed.data.websiteUrl,
                socials: socialsFromForm(parsed.data),
            },
            user.email,
        )
        // Sponsor-owned data flows into Jira on every save (portal wins).
        await services.sponsorSync.pushSponsorOwnedData(sponsor.issueKey, 'details')
        await recordCompletionIfReady(services, sponsor)
        await services.sponsorSync.flipWorkstreamStatuses(sponsor.issueKey)
        return data({
            intent: 'save-details' as const,
            saved: true,
            nextSection: await nextSectionAfterSave(services, sponsor),
        })
    }

    if (intent === 'upload-logo') {
        const file = formData.get('logo')
        if (!(file instanceof File) || file.size === 0) {
            return data({ intent: 'upload-logo' as const, error: 'Choose a file to upload' }, { status: 400 })
        }
        if (file.size > LOGO_MAX_BYTES) {
            return data({ intent: 'upload-logo' as const, error: 'Logo must be under 10 MB' }, { status: 400 })
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        const uploadError = validateLogoUpload({ contentType: file.type, size: file.size, bytes })
        if (uploadError) {
            return data({ intent: 'upload-logo' as const, error: uploadError }, { status: 400 })
        }

        const extension = logoExtensionForContentType(file.type)
        const key = `sponsors/${sponsor.year}/${sponsor.issueKey}/logo-${Date.now()}.${extension}`
        await services.assets.put(key, bytes.buffer, { contentType: file.type })
        await services.sponsors.saveLogo(
            sponsor.issueKey,
            { r2Key: key, filename: file.name || `logo.${extension}`, contentType: file.type, size: file.size },
            user.email,
        )
        // Re-attaches the new logo in Jira when this is a post-completion change.
        await services.sponsorSync.pushSponsorOwnedData(sponsor.issueKey, 'logo')
        await recordCompletionIfReady(services, sponsor)
        await services.sponsorSync.flipWorkstreamStatuses(sponsor.issueKey)
        return data({
            intent: 'upload-logo' as const,
            saved: true,
            nextSection: await nextSectionAfterSave(services, sponsor),
        })
    }

    return data({ intent: 'unknown' as const, error: 'Unknown action' }, { status: 400 })
}

export default function PortalProfile() {
    const { blurb, websiteUrl, socials, logo, issueKey, nextSection } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()
    const isSubmitting = navigation.state === 'submitting'
    const [selectedLogo, setSelectedLogo] = useState<{ name: string; size: number } | null>(null)

    const fieldErrors =
        actionData?.intent === 'save-details' && 'fieldErrors' in actionData ? actionData.fieldErrors : {}
    const detailsSaved = actionData?.intent === 'save-details' && 'saved' in actionData
    const logoSaved = actionData?.intent === 'upload-logo' && 'saved' in actionData
    // The action recomputes this after writing, so it reflects the save the
    // sponsor just made rather than the loader's pre-save snapshot.
    const savedNextSection = actionData && 'nextSection' in actionData ? actionData.nextSection : nextSection
    const logoError = actionData?.intent === 'upload-logo' && 'error' in actionData ? actionData.error : null

    return (
        <Box maxW="4xl" mx="auto">
            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Company logo
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600" mb="4">
                    Upload the highest-resolution version you have — SVG preferred, PNG or JPEG also fine (max 10 MB).
                    We'll prepare light/dark variants for the website from it.
                </styled.p>

                {logoSaved && <PortalSavedBanner message="Logo uploaded — thank you!" next={savedNextSection} />}
                {logoError && (
                    <Box mb="4" p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                        {logoError}
                    </Box>
                )}

                {logo && (
                    <Flex mb="4" p="4" bg="admin.100" borderRadius="md" align="center" gap="4">
                        <styled.img
                            src={`/portal/logo/${issueKey}`}
                            alt="Current logo"
                            maxH="16"
                            maxW="48"
                            objectFit="contain"
                        />
                        <Box fontSize="sm" color="admin.700">
                            <styled.p fontWeight="medium" color="admin.900">
                                {logo.filename}
                            </styled.p>
                            <styled.p>Uploading a new file replaces this one.</styled.p>
                        </Box>
                    </Flex>
                )}

                <Form method="post" encType="multipart/form-data">
                    <input type="hidden" name="_action" value="upload-logo" />
                    <styled.label htmlFor="logo" className={dropzoneClass}>
                        <styled.input
                            id="logo"
                            type="file"
                            name="logo"
                            accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
                            display="none"
                            onChange={(event) => {
                                const file = event.currentTarget.files?.[0]
                                setSelectedLogo(file ? { name: file.name, size: file.size } : null)
                            }}
                        />
                        {selectedLogo ? (
                            <>
                                <styled.p fontSize="sm" fontWeight="semibold" color="admin.900">
                                    {selectedLogo.name}
                                </styled.p>
                                <styled.p mt="1" fontSize="xs" color="admin.600">
                                    {(selectedLogo.size / 1024 / 1024).toFixed(1)} MB — ready to upload, or click to
                                    pick a different file
                                </styled.p>
                            </>
                        ) : (
                            <>
                                <styled.p fontSize="sm" fontWeight="semibold" color="admin.900">
                                    Click to choose your logo file
                                </styled.p>
                                <styled.p mt="1" fontSize="xs" color="admin.600">
                                    SVG preferred · PNG or JPEG also fine · max 10 MB
                                </styled.p>
                            </>
                        )}
                    </styled.label>
                    <Flex mt="4" justify="flex-end">
                        <PrimaryButton disabled={isSubmitting || !selectedLogo}>
                            {isSubmitting ? 'Uploading…' : logo ? 'Replace logo' : 'Upload logo'}
                        </PrimaryButton>
                    </Flex>
                </Form>
            </AdminCard>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Company details
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600" mb="4">
                    The blurb and website link appear alongside your logo on the conference website.
                </styled.p>

                {detailsSaved && <PortalSavedBanner message="Details saved." next={savedNextSection} />}

                <Form method="post">
                    <input type="hidden" name="_action" value="save-details" />

                    <Box mb="5">
                        <label htmlFor="blurb" className={fieldLabelClass}>
                            Company blurb / quote
                        </label>
                        <textarea
                            id="blurb"
                            name="blurb"
                            rows={4}
                            defaultValue={blurb}
                            placeholder="A sentence or two about your company, or a quote about why you sponsor"
                            className={inputClass}
                        />
                        <FieldError message={fieldErrors.blurb} />
                    </Box>

                    <Box mb="5">
                        <label htmlFor="websiteUrl" className={fieldLabelClass}>
                            Website URL
                        </label>
                        <input
                            id="websiteUrl"
                            name="websiteUrl"
                            type="url"
                            defaultValue={websiteUrl}
                            placeholder="https://example.com"
                            className={inputClass}
                        />
                        <FieldError message={fieldErrors.websiteUrl} />
                    </Box>

                    <styled.h3 fontSize="md" fontWeight="semibold" mt="8" mb="3" color="admin.900">
                        Social media{' '}
                        <styled.span fontSize="sm" fontWeight="normal" color="admin.600">
                            (optional)
                        </styled.span>
                    </styled.h3>
                    <Grid columns={{ base: 1, md: 2 }} columnGap="6" rowGap="4">
                        {SOCIAL_PLATFORMS.map((platform) => (
                            <Box key={platform.key}>
                                <label htmlFor={`social_${platform.key}`} className={fieldLabelClass}>
                                    {platform.label}
                                </label>
                                <input
                                    id={`social_${platform.key}`}
                                    name={`social_${platform.key}`}
                                    type="url"
                                    defaultValue={socials[platform.key] ?? ''}
                                    placeholder="https://…"
                                    className={inputClass}
                                />
                                <FieldError message={fieldErrors[`social_${platform.key}`]} />
                            </Box>
                        ))}
                    </Grid>

                    <Flex mt="8" justify="flex-end">
                        <PrimaryButton disabled={isSubmitting}>
                            {isSubmitting ? 'Saving…' : 'Save details'}
                        </PrimaryButton>
                    </Flex>
                </Form>
            </AdminCard>
        </Box>
    )
}

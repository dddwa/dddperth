import { conferenceManifest } from '@conference/manifest'
import { data, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { FieldError, fieldLabelClass, inputClass, PrimaryButton, textareaClass } from '~/components/portal-form'
import { requireSponsorContact } from '~/lib/auth.server'
import { parseFormData } from '~/lib/forms/parse-form.server'
import {
    BUMP_IN_SLOTS,
    BUMP_OUT_WINDOWS,
    filterByVisibility,
    logisticsSchema,
    logisticsVisibility,
    LOGISTICS_KEYS,
    PARKING_OPTIONS,
    RAFFLE_LOCATIONS,
    SCREEN_OPTIONS,
    type LogisticsFields,
} from '~/lib/sponsors/logistics'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, Grid, styled } from '~/styled-system/jsx'
import type { Route } from './+types/portal.logistics'

/** Maps the sponsor's raw Jira tier through the manifest, so gating keys off
 * the stable category (`platinum`) rather than the Jira option label. */
function mappedTier(rawTier: string): string | undefined {
    const tierMap = conferenceManifest.sponsorPortal?.jira.tierMap ?? {}
    return tierMap[rawTier]
}

export async function loader({ request, context }: Route.LoaderArgs) {
    const { sponsor } = await requireSponsorContact(request, context)
    const profile = await getServices(context).sponsors.getProfile(sponsor.issueKey)

    return {
        tier: sponsor.tier,
        visibility: logisticsVisibility(mappedTier(sponsor.tier)),
        logistics: profile?.logistics ?? {},
    }
}

export async function action({ request, context }: Route.ActionArgs) {
    const { user, sponsor } = await requireSponsorContact(request, context)
    const services = getServices(context)

    const formData = await request.formData()

    // Checkbox groups post as `field[]` repeated; collapse each into the
    // comma-separated string the schema and Jira write-back expect.
    for (const name of ['parking', 'screenOrders'] as const) {
        const values = formData.getAll(`${name}[]`).filter((value): value is string => typeof value === 'string')
        formData.delete(`${name}[]`)
        formData.set(name, values.join(', '))
    }

    const parsed = parseFormData(logisticsSchema, formData)
    if (!parsed.ok) {
        return data({ fieldErrors: parsed.fieldErrors }, { status: 400 })
    }

    // Re-derive visibility server-side: a tier change (or a hand-crafted
    // POST) must not write exhibition answers for a sponsor without a booth.
    const visible = filterByVisibility(parsed.data, logisticsVisibility(mappedTier(sponsor.tier)))

    const logistics: Record<string, string> = {}
    for (const key of LOGISTICS_KEYS) {
        const value = visible[key]
        if (typeof value === 'string' && value !== '') logistics[key] = value
    }

    await services.sponsors.saveLogistics(sponsor.issueKey, logistics, user.email)
    // Sponsor-owned, so the portal's values win in Jira. Best-effort: the
    // sponsor's save must not fail because Jira is down.
    await services.sponsorSync.pushLogistics(sponsor.issueKey, logistics)

    return data({ saved: true })
}

function Text({
    name,
    label,
    hint,
    value,
    errors,
    placeholder,
}: {
    name: keyof LogisticsFields
    label: string
    hint?: string
    value: string
    errors: Record<string, string | undefined>
    placeholder?: string
}) {
    return (
        <Box>
            <label htmlFor={name} className={fieldLabelClass}>
                {label}
            </label>
            {hint && (
                <styled.p fontSize="xs" color="admin.600" mt="0.5">
                    {hint}
                </styled.p>
            )}
            <input id={name} name={name} defaultValue={value} placeholder={placeholder} className={inputClass} />
            <FieldError message={errors[name]} />
        </Box>
    )
}

function Select({
    name,
    label,
    hint,
    value,
    errors,
    options,
}: {
    name: keyof LogisticsFields
    label: string
    hint?: string
    value: string
    errors: Record<string, string | undefined>
    options: readonly string[]
}) {
    return (
        <Box>
            <label htmlFor={name} className={fieldLabelClass}>
                {label}
            </label>
            {hint && (
                <styled.p fontSize="xs" color="admin.600" mt="0.5">
                    {hint}
                </styled.p>
            )}
            <select id={name} name={name} defaultValue={value} className={inputClass}>
                <option value="">— not sure yet —</option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
            <FieldError message={errors[name]} />
        </Box>
    )
}

/**
 * Jira multi-checkbox fields. Rendered as checkboxes sharing one hidden input
 * name, joined comma-separated — parseFormData keeps only the last value for a
 * repeated key, so each box can't post under its own name.
 */
function CheckboxGroup({
    name,
    label,
    hint,
    value,
    options,
}: {
    name: keyof LogisticsFields
    label: string
    hint?: string
    value: string
    options: readonly string[]
}) {
    const selected = new Set(
        value
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean),
    )

    return (
        <Box>
            <styled.fieldset border="none" p="0" m="0">
                <styled.legend className={fieldLabelClass} p="0">
                    {label}
                </styled.legend>
                {hint && (
                    <styled.p fontSize="xs" color="admin.600" mt="0.5">
                        {hint}
                    </styled.p>
                )}
                <Box display="grid" gap="1.5" mt="2">
                    {options.map((option) => (
                        <styled.label key={option} display="flex" gap="2" alignItems="center" fontSize="sm">
                            <input
                                type="checkbox"
                                name={`${name}[]`}
                                value={option}
                                defaultChecked={selected.has(option)}
                            />
                            {option}
                        </styled.label>
                    ))}
                </Box>
            </styled.fieldset>
        </Box>
    )
}

function LongText({
    name,
    label,
    hint,
    value,
    errors,
    placeholder,
}: {
    name: keyof LogisticsFields
    label: string
    hint?: string
    value: string
    errors: Record<string, string | undefined>
    placeholder?: string
}) {
    return (
        <Box>
            <label htmlFor={name} className={fieldLabelClass}>
                {label}
            </label>
            {hint && (
                <styled.p fontSize="xs" color="admin.600" mt="0.5">
                    {hint}
                </styled.p>
            )}
            <textarea
                id={name}
                name={name}
                rows={3}
                defaultValue={value}
                placeholder={placeholder}
                className={textareaClass}
            />
            <FieldError message={errors[name]} />
        </Box>
    )
}

function SectionHeading({ children, hint }: { children: string; hint?: string }) {
    return (
        <>
            <styled.h3 fontSize="md" fontWeight="semibold" mt="8" mb="1" color="admin.900">
                {children}
            </styled.h3>
            {hint && (
                <styled.p fontSize="sm" color="admin.600" mb="3">
                    {hint}
                </styled.p>
            )}
        </>
    )
}

export default function PortalLogistics() {
    const { visibility, logistics } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()
    const isSubmitting = navigation.state === 'submitting'

    const errors = actionData && 'fieldErrors' in actionData ? actionData.fieldErrors : {}
    const saved = actionData && 'saved' in actionData
    const value = (key: keyof LogisticsFields) => logistics[key] ?? ''

    return (
        <Box maxW="4xl" mx="auto">
            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Event logistics
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600" mb="4">
                    Everything the venue and our logistics team need from you. Nothing here is required up front —
                    save as much as you know now and come back to fill in the rest.
                </styled.p>

                {saved && (
                    <Box mb="4" p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                        Saved — thank you!
                    </Box>
                )}

                <Form method="post">
                    {visibility.exhibition && (
                        <>
                            <SectionHeading hint="Who we should contact on the day about your exhibition space.">
                                Exhibitor contact
                            </SectionHeading>
                            <Grid columns={{ base: 1, md: 2 }} columnGap="6" rowGap="4">
                                <Text
                                    name="exhibitorContactName"
                                    label="Contact name"
                                    value={value('exhibitorContactName')}
                                    errors={errors}
                                />
                                <Text
                                    name="exhibitorContactPhone"
                                    label="Contact phone"
                                    hint="A mobile we can reach on the day"
                                    value={value('exhibitorContactPhone')}
                                    errors={errors}
                                />
                                <Text
                                    name="exhibitorContactEmail"
                                    label="Contact email"
                                    value={value('exhibitorContactEmail')}
                                    errors={errors}
                                />
                            </Grid>

                            <SectionHeading hint="When you'll set up and pack down. The venue schedules the loading dock from these.">
                                Bump in &amp; bump out
                            </SectionHeading>
                            <Grid columns={{ base: 1, md: 2 }} columnGap="6" rowGap="4">
                                <Select
                                    name="bumpInSlot"
                                    label="Bump-in day and time"
                                    value={value('bumpInSlot')}
                                    errors={errors}
                                    options={BUMP_IN_SLOTS}
                                />
                                <Select
                                    name="bumpOutWindow"
                                    label="Bump-out window"
                                    value={value('bumpOutWindow')}
                                    errors={errors}
                                    options={BUMP_OUT_WINDOWS}
                                />
                            </Grid>
                            <Box mt="4">
                                <CheckboxGroup
                                    name="parking"
                                    label="Under-stadium drop-off/pick-up needed?"
                                    hint="Tick any that apply"
                                    value={value('parking')}
                                    options={PARKING_OPTIONS}
                                />
                            </Box>

                            <SectionHeading hint="What you're bringing, and what you need to move it.">
                                Equipment &amp; loading dock
                            </SectionHeading>
                            <Box display="grid" gap="4">
                                <LongText
                                    name="equipmentList"
                                    label="Equipment list"
                                    hint="Include approximate quantity and weight — the venue plans dock access from this"
                                    placeholder="1x pop-up banner (5kg), 2x crates (20kg each)…"
                                    value={value('equipmentList')}
                                    errors={errors}
                                />
                                <LongText
                                    name="nonLaptopElectrical"
                                    label="Non-laptop electrical equipment"
                                    hint="Anything needing power beyond laptops — these may need testing and tagging"
                                    value={value('nonLaptopElectrical')}
                                    errors={errors}
                                />
                                <Grid columns={{ base: 1, md: 2 }} columnGap="6" rowGap="4">
                                    <Text
                                        name="trolleyOrForklift"
                                        label="Trolley or forklift needed?"
                                        value={value('trolleyOrForklift')}
                                        errors={errors}
                                    />
                                    <Text
                                        name="loadingDockAssistance"
                                        label="Help moving from the loading dock?"
                                        value={value('loadingDockAssistance')}
                                        errors={errors}
                                    />
                                    <Text
                                        name="porterAssistance"
                                        label="Venue porter assistance needed?"
                                        value={value('porterAssistance')}
                                        errors={errors}
                                    />
                                </Grid>
                                <LongText
                                    name="additionalNotes"
                                    label="Anything else the venue should know?"
                                    value={value('additionalNotes')}
                                    errors={errors}
                                />
                            </Box>
                        </>
                    )}

                    {visibility.induction && (
                        <>
                            <SectionHeading hint="The venue requires a safety induction for anyone accessing the loading dock. We pass these names to them for that purpose only.">
                                Bump-in attendees
                            </SectionHeading>
                            <Box display="grid" gap="4">
                                <LongText
                                    name="bumpInAttendees"
                                    label="Who's attending bump-in?"
                                    hint="One name per line"
                                    value={value('bumpInAttendees')}
                                    errors={errors}
                                />
                                <LongText
                                    name="loadingDockAttendees"
                                    label="Who needs loading dock access?"
                                    hint="One name per line — these people need the venue's safety induction"
                                    value={value('loadingDockAttendees')}
                                    errors={errors}
                                />
                            </Box>
                        </>
                    )}

                    {visibility.screens && (
                        <>
                            <SectionHeading hint="Screens are supplied and invoiced by the venue, not by DDD Perth.">
                                TV screen orders
                            </SectionHeading>
                            <Box display="grid" gap="4">
                                <CheckboxGroup
                                    name="screenOrders"
                                    label="Screens required"
                                    hint="Leave all unticked if you don't need any"
                                    value={value('screenOrders')}
                                    options={SCREEN_OPTIONS}
                                />
                                <Grid columns={{ base: 1, md: 2 }} columnGap="6" rowGap="4">
                                    <Text
                                        name="screenInvoicingEmail"
                                        label="Invoicing email"
                                        hint="Where the venue should send the screen invoice"
                                        value={value('screenInvoicingEmail')}
                                        errors={errors}
                                    />
                                </Grid>
                                <LongText
                                    name="screenNotes"
                                    label="Screen ordering notes"
                                    value={value('screenNotes')}
                                    errors={errors}
                                />
                            </Box>
                        </>
                    )}

                    {visibility.raffle && (
                        <>
                            <SectionHeading hint="Optional — a prize for the end-of-day raffle.">
                                Raffle prize
                            </SectionHeading>
                            <Box display="grid" gap="4">
                                <LongText
                                    name="rafflePrize"
                                    label="Prize and approximate value"
                                    placeholder="Mechanical keyboard (~$250)"
                                    value={value('rafflePrize')}
                                    errors={errors}
                                />
                                <Select
                                    name="raffleLocation"
                                    label="Where should it be given away?"
                                    value={value('raffleLocation')}
                                    errors={errors}
                                    options={RAFFLE_LOCATIONS}
                                />
                            </Box>
                        </>
                    )}

                    {visibility.socialQuote && (
                        <>
                            <SectionHeading hint="Used in our social posts announcing your sponsorship. This is separate from the website blurb on the Profile page.">
                                Quote for social media
                            </SectionHeading>
                            <LongText
                                name="socialQuote"
                                label="Your quote"
                                value={value('socialQuote')}
                                errors={errors}
                            />
                        </>
                    )}

                    <Flex mt="8" justify="flex-end">
                        <PrimaryButton disabled={isSubmitting}>
                            {isSubmitting ? 'Saving…' : 'Save logistics'}
                        </PrimaryButton>
                    </Flex>
                </Form>
            </AdminCard>
        </Box>
    )
}

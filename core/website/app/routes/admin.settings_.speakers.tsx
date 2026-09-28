import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { data, Form, redirect, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { fieldLabelClass, inputClass } from '~/components/portal-form'
import { Button } from '~/components/ui/button'
import { parseSpeakerSettingsForm, toDateTimeLocal } from '~/lib/admin-settings/speakers'
import { loadSpeakerSettings, speakerSettingsFallback } from '~/lib/admin-settings/speakers.server'
import { requireAdmin } from '~/lib/auth.server'
import { SPEAKER_TRAINING_SESSION_OPTIONS } from '~/lib/services/speakers-store'
import { SPEAKER_CHECKLIST_ITEMS } from '~/lib/speakers/checklist-items'
import { getServices } from '~/remix-app-load-context'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.settings_.speakers'

/** Blank Meet the Experts rows rendered after the saved ones, so a slot can
 * be added without any client-side JS. */
const NEW_SLOT_ROWS = 2

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)

    const saved = await getServices(context).adminSettings.get('speakers')
    const values = saved?.value ?? speakerSettingsFallback(context)

    return {
        saved: saved ? { updatedAt: saved.updatedAt, updatedBy: saved.updatedBy } : null,
        timezone: conferenceManifest.public.timezone,
        dueDates: SPEAKER_CHECKLIST_ITEMS.map((item) => ({
            key: item.key,
            label: item.label,
            value: toDateTimeLocal(values.dueDates[item.key]),
        })),
        training: SPEAKER_TRAINING_SESSION_OPTIONS.map((id) => {
            const session = values.trainingSessions.find((s) => s.id === id)
            return { id, title: session?.title ?? '', start: toDateTimeLocal(session?.start), end: toDateTimeLocal(session?.end) }
        }),
        dinner: {
            start: toDateTimeLocal(values.dinner?.start),
            end: toDateTimeLocal(values.dinner?.end),
            location: values.dinner?.location ?? '',
        },
        infoPackUrl: values.infoPackUrl ?? '',
        ticketClaimUrl: values.ticketClaimUrl ?? '',
        slots: values.meetTheExpertsSlots,
    }
}

export async function action({ request, context }: Route.ActionArgs) {
    const user = await requireAdmin(request, context)
    const services = getServices(context)
    const formData = await request.formData()

    if (formData.get('_action') === 'clear') {
        await services.adminSettings.clear('speakers')
        return redirect('/admin/settings/speakers')
    }

    const parsed = parseSpeakerSettingsForm(formData)
    if ('errors' in parsed) return data({ errors: parsed.errors }, { status: 400 })

    // Registrations (and their seating) point at slot ids, so a slot someone
    // has picked can be renamed but not removed.
    const [current, registrations] = await Promise.all([
        loadSpeakerSettings(context),
        services.meetTheExperts.listRegistrations(),
    ])
    const keptIds = new Set(parsed.value.meetTheExpertsSlots.map((slot) => slot.id))
    const blocked = current.meetTheExpertsSlots
        .filter((slot) => !keptIds.has(slot.id))
        .map((slot) => ({ slot, count: registrations.filter((r) => r.slots.includes(slot.id)).length }))
        .filter(({ count }) => count > 0)
    if (blocked.length > 0) {
        return data(
            {
                errors: blocked.map(
                    ({ slot, count }) =>
                        `Meet the Experts slot "${slot.label}" can't be removed: ${count} registration(s) include it. Rename it instead.`,
                ),
            },
            { status: 400 },
        )
    }

    await services.adminSettings.set('speakers', parsed.value, user.email)
    return redirect('/admin/settings/speakers')
}

function Field({ label, name, type = 'text', defaultValue }: { label: string; name: string; type?: string; defaultValue: string }) {
    return (
        <label className={fieldLabelClass}>
            {label}
            <input className={inputClass} name={name} type={type} defaultValue={defaultValue} />
        </label>
    )
}

// css() rather than a spread props object, so Panda's static extraction sees it.
const fieldGridClass = css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))', gap: '4' })

export default function AdminSpeakerSettings() {
    const { saved, timezone, dueDates, training, dinner, infoPackUrl, ticketClaimUrl, slots } =
        useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const saving = useNavigation().state === 'submitting'

    return (
        <AdminLayout heading="Speaker Settings">
            <AppLink to="/admin/settings" unstyled fontSize="sm" color="indigo.9">
                ← All settings
            </AppLink>

            <Box my="6" p="4" borderRadius="md" fontSize="sm" bg={saved ? 'status.success.bg' : 'status.warning.bg'}>
                {saved ? (
                    <styled.p color="status.success.fg">
                        Saved by {saved.updatedBy},{' '}
                        {DateTime.fromISO(saved.updatedAt, { zone: timezone }).toLocaleString(DateTime.DATETIME_SHORT, {
                            locale: 'en-AU',
                        })}
                        . The speaker and sponsor portals use these values.
                    </styled.p>
                ) : (
                    <styled.p color="status.warning.fg">
                        Not saved yet: these values come from the conference config in code, and the portals use
                        them until you save here. Once saved, these values replace the config ones.
                    </styled.p>
                )}
            </Box>

            {actionData?.errors && (
                <Box role="alert" mb="6" p="4" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                    <styled.ul pl="5" listStyleType="disc">
                        {actionData.errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </styled.ul>
                </Box>
            )}

            <styled.p fontSize="sm" color="admin.600" mb="6">
                All times are in {timezone}. Leave a field blank to leave it unset.
            </styled.p>

            <Form method="post">
                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                        Checklist due dates
                    </styled.h2>
                    <div className={fieldGridClass}>
                        {dueDates.map((item) => (
                            <Field
                                key={item.key}
                                label={item.label}
                                name={`dueDate.${item.key}`}
                                type="datetime-local"
                                defaultValue={item.value}
                            />
                        ))}
                    </div>
                </AdminCard>

                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Speaker training
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600" mb="4">
                        Leave a session&apos;s title blank to not offer it.
                    </styled.p>
                    {training.map((session) => (
                        <styled.fieldset key={session.id} mb="4">
                            <styled.legend fontWeight="medium" mb="2">
                                {session.id}
                            </styled.legend>
                            <div className={fieldGridClass}>
                                <Field label="Title" name={`training.${session.id}.title`} defaultValue={session.title} />
                                <Field
                                    label="Start"
                                    name={`training.${session.id}.start`}
                                    type="datetime-local"
                                    defaultValue={session.start}
                                />
                                <Field
                                    label="End"
                                    name={`training.${session.id}.end`}
                                    type="datetime-local"
                                    defaultValue={session.end}
                                />
                            </div>
                        </styled.fieldset>
                    ))}
                </AdminCard>

                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Speaker dinner
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600" mb="4">
                        Leave the times blank to hide the dinner RSVP.
                    </styled.p>
                    <div className={fieldGridClass}>
                        <Field label="Start" name="dinner.start" type="datetime-local" defaultValue={dinner.start} />
                        <Field label="End" name="dinner.end" type="datetime-local" defaultValue={dinner.end} />
                        <Field label="Location" name="dinner.location" defaultValue={dinner.location} />
                    </div>
                </AdminCard>

                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                        Links
                    </styled.h2>
                    <div className={fieldGridClass}>
                        <Field label="Speaker info pack URL" name="infoPackUrl" type="url" defaultValue={infoPackUrl} />
                        <Field
                            label="Speaker ticket claim URL"
                            name="ticketClaimUrl"
                            type="url"
                            defaultValue={ticketClaimUrl}
                        />
                    </div>
                </AdminCard>

                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Meet the Experts slots
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600" mb="4">
                        Shared by the speaker and sponsor portals. Fill in a blank row to add a slot; clear a label to
                        remove it (only possible while nobody has picked it).
                    </styled.p>
                    <div className={fieldGridClass}>
                        {[...slots, ...Array.from({ length: NEW_SLOT_ROWS }, () => ({ id: '', label: '' }))].map(
                            (slot, i) => (
                                <Box key={slot.id || `new-${i}`}>
                                    <input type="hidden" name="slot.id" value={slot.id} />
                                    <Field label={`Slot ${i + 1}`} name="slot.label" defaultValue={slot.label} />
                                </Box>
                            ),
                        )}
                    </div>
                </AdminCard>

                <Button type="submit" name="_action" value="save" loading={saving}>
                    Save speaker settings
                </Button>
            </Form>

            {saved && (
                <Form method="post">
                    <Flex mt="8" gap="4" align="center" wrap="wrap">
                        <Button
                            type="submit"
                            name="_action"
                            value="clear"
                            variant="outline"
                            onClick={(e) => {
                                if (!confirm('Clear all saved speaker settings?')) e.preventDefault()
                            }}
                        >
                            Clear saved settings
                        </Button>
                        <styled.p fontSize="sm" color="admin.600">
                            For a new year: clears everything here, so the portals fall back to the config values
                            until you save again.
                        </styled.p>
                    </Flex>
                </Form>
            )}
        </AdminLayout>
    )
}

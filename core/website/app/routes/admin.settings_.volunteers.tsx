import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import {
    data,
    Form,
    redirect,
    useActionData,
    useLoaderData,
    useNavigation,
    type ActionFunctionArgs,
    type LoaderFunctionArgs,
} from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { fieldLabelClass, inputClass } from '~/components/portal-form'
import { Button } from '~/components/ui/button'
import { parseVolunteerSettingsForm } from '~/lib/admin-settings/volunteers'
import { requireAdmin } from '~/lib/auth.server'
import { VOLUNTEER_ROLES } from '~/lib/services/volunteers-store'
import { getServices } from '~/remix-app-load-context'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'

/** Blank link rows rendered after each role's saved ones, so a link can be
 * added without any client-side JS. */
const NEW_LINK_ROWS = 2

export async function loader({ request, context }: LoaderFunctionArgs) {
    await requireAdmin(request, context)

    const saved = await getServices(context).adminSettings.get('volunteers')

    return {
        saved: saved ? { updatedAt: saved.updatedAt, updatedBy: saved.updatedBy } : null,
        timezone: conferenceManifest.public.timezone,
        roles: VOLUNTEER_ROLES.map((role) => ({
            id: role.id,
            label: role.label,
            links: saved?.value.roleLinks[role.id] ?? [],
        })),
    }
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAdmin(request, context)
    const services = getServices(context)
    const formData = await request.formData()

    if (formData.get('_action') === 'clear') {
        await services.adminSettings.clear('volunteers')
        return redirect('/admin/settings/volunteers')
    }

    const parsed = parseVolunteerSettingsForm(formData)
    if ('errors' in parsed) return data({ errors: parsed.errors }, { status: 400 })

    await services.adminSettings.set('volunteers', parsed.value, user.email)
    return redirect('/admin/settings/volunteers')
}

// css() rather than a spread props object, so Panda's static extraction sees it.
const linkRowClass = css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))', gap: '4' })

export default function AdminVolunteerSettings() {
    const { saved, timezone, roles } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const saving = useNavigation().state === 'submitting'

    return (
        <AdminLayout heading="Volunteer Settings">
            <AppLink to="/admin/settings" unstyled fontSize="sm" color="indigo.9">
                ← All settings
            </AppLink>

            {saved && (
                <Box my="6" p="4" borderRadius="md" fontSize="sm" bg="status.success.bg">
                    <styled.p color="status.success.fg">
                        Saved by {saved.updatedBy},{' '}
                        {DateTime.fromISO(saved.updatedAt, { zone: timezone }).toLocaleString(DateTime.DATETIME_SHORT, {
                            locale: 'en-AU',
                        })}
                        .
                    </styled.p>
                </Box>
            )}

            {actionData?.errors && (
                <Box
                    role="alert"
                    my="6"
                    p="4"
                    bg="status.danger.bg"
                    borderRadius="md"
                    fontSize="sm"
                    color="status.danger.fg"
                >
                    <styled.ul pl="5" listStyleType="disc">
                        {actionData.errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </styled.ul>
                </Box>
            )}

            <styled.p fontSize="sm" color="admin.600" my="6">
                Info links for each volunteer role — role instructions, briefing docs and the like. They&apos;re shown
                on the public run sheet when it&apos;s filtered to that role&apos;s team, so only add links that are
                fine for anyone to see. Fill in a blank row to add a link; clear both fields to remove one.
            </styled.p>

            <Form method="post">
                {roles.map((role) => (
                    <AdminCard key={role.id}>
                        <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                            {role.label}
                        </styled.h2>
                        {[...role.links, ...Array.from({ length: NEW_LINK_ROWS }, () => ({ title: '', url: '' }))].map(
                            (link, i) => (
                                <styled.fieldset key={link.url || `new-${i}`} mb="4">
                                    <styled.legend fontWeight="medium" mb="2">
                                        Link {i + 1}
                                    </styled.legend>
                                    <div className={linkRowClass}>
                                        <label className={fieldLabelClass}>
                                            Title
                                            <input
                                                className={inputClass}
                                                name={`link.${role.id}.title`}
                                                defaultValue={link.title}
                                            />
                                        </label>
                                        <label className={fieldLabelClass}>
                                            URL
                                            <input
                                                className={inputClass}
                                                name={`link.${role.id}.url`}
                                                type="url"
                                                defaultValue={link.url}
                                            />
                                        </label>
                                    </div>
                                </styled.fieldset>
                            ),
                        )}
                    </AdminCard>
                ))}

                <Button type="submit" name="_action" value="save" loading={saving}>
                    Save volunteer settings
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
                                if (!confirm('Clear all saved volunteer settings?')) e.preventDefault()
                            }}
                        >
                            Clear saved settings
                        </Button>
                        <styled.p fontSize="sm" color="admin.600">
                            For a new year: removes every link here.
                        </styled.p>
                    </Flex>
                </Form>
            )}
        </AdminLayout>
    )
}

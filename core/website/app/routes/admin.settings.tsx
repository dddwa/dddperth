import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { data, Form, redirect, useActionData, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import { calculateImportantDates } from '~/lib/calculate-important-dates.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { getConferenceState, getConfig, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled, VStack } from '~/styled-system/jsx'
import type { Route } from './+types/admin.settings'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)

    const adminDateTimeSessionStorage = getServices(context).sessions.adminDateTime
    const session = await adminDateTimeSessionStorage.getSession(request.headers.get('cookie'))
    const overrideDate = session.get('adminDateOverride')

    const yearConfig = getYearConfig(getConferenceState(context).conference.year, getConfig(context))
    const year = getConferenceState(context).conference.year

    const importantDates = yearConfig.kind === 'cancelled' ? [] : calculateImportantDates(yearConfig)

    const currentAnnouncement = await getServices(context).announcements.getCurrent(year)

    return data({
        overrideDate,
        currentDate: DateTime.local({ zone: conferenceManifest.public.timezone }).toISO(),
        timezone: conferenceManifest.public.timezone,
        importantDates,
        year,
        announcement: currentAnnouncement,
    })
}

export async function action({ request, context }: Route.ActionArgs) {
    await requireAdmin(request, context)

    const formData = await request.formData()
    const action = formData.get('_action')
    const adminDateTimeSessionStorage = getServices(context).sessions.adminDateTime
    const session = await adminDateTimeSessionStorage.getSession(request.headers.get('cookie'))
    const year = getConferenceState(context).conference.year

    if (action === 'updateAnnouncement') {
        const message = formData.get('announcement') as string
        if (!message || message.trim() === '') {
            return data({ error: 'Announcement message is required' }, { status: 400 })
        }
        await getServices(context).announcements.upsert(year, message.trim())
        return redirect('/admin/settings')
    } else if (action === 'clearAnnouncement') {
        await getServices(context).announcements.clear(year)
        return redirect('/admin/settings')
    } else if (action === 'setDate') {
        const dateStr = formData.get('date') as string
        const timeStr = formData.get('time') as string

        if (!dateStr || !timeStr) {
            return data({ error: 'Date and time are required' }, { status: 400 })
        }

        const override = DateTime.fromISO(`${dateStr}T${timeStr}`, {
            zone: conferenceManifest.public.timezone,
        })

        if (!override.isValid) {
            return data({ error: 'Invalid date/time format' }, { status: 400 })
        }

        session.set('adminDateOverride', override.toISO())
    } else if (action === 'clearDate') {
        session.unset('adminDateOverride')
    } else if (action === 'jumpToDate') {
        const jumpDate = formData.get('jumpDate') as string

        if (!jumpDate) {
            return data({ error: 'Jump date is required' }, { status: 400 })
        }

        const override = DateTime.fromISO(jumpDate, {
            zone: conferenceManifest.public.timezone,
        })

        if (!override.isValid) {
            return data({ error: 'Invalid jump date format' }, { status: 400 })
        }

        session.set('adminDateOverride', override.toISO())
    }

    return redirect('/admin/settings', {
        headers: {
            'Set-Cookie': await adminDateTimeSessionStorage.commitSession(session),
        },
    })
}

export default function AdminSettings() {
    const { overrideDate, currentDate, timezone, importantDates, year, announcement } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()

    const overrideDateTime = overrideDate
        ? DateTime.fromISO(overrideDate, { zone: conferenceManifest.public.timezone })
        : null
    const currentDateTime = DateTime.fromISO(currentDate, { zone: conferenceManifest.public.timezone })

    return (
        <AdminLayout heading="Admin Settings">
            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="6">
                    Date Override
                </styled.h2>

                {actionData && 'error' in actionData && (
                    <Box
                        mb="4"
                        p="3"
                        bg="status.danger.bg"
                        border="admin-subtle"
                        borderRadius="md"
                        color="status.danger.fg"
                        fontSize="sm"
                    >
                        {actionData.error}
                    </Box>
                )}

                <Box mb="6" p="4" bg="status.info.bg" borderRadius="md" fontSize="sm">
                    <styled.p fontWeight="medium" color="status.info.fg" mb="2">
                        Current System Time ({timezone})
                    </styled.p>
                    <styled.p color="status.info.fg">
                        {currentDateTime.toLocaleString(DateTime.DATETIME_FULL, { locale: 'en-AU' })}
                    </styled.p>
                </Box>

                {overrideDateTime && (
                    <Box mb="6" p="4" bg="status.warning.bg" borderRadius="md" fontSize="sm">
                        <styled.p fontWeight="medium" color="status.warning.fg" mb="2">
                            Override Active
                        </styled.p>
                        <styled.p color="status.warning.fg">
                            {overrideDateTime.toLocaleString(DateTime.DATETIME_FULL, { locale: 'en-AU' })}
                        </styled.p>
                    </Box>
                )}

                <Form method="post">
                    <styled.h3 fontSize="lg" fontWeight="medium" mb="4">
                        Set Override Date/Time
                    </styled.h3>

                    <Flex gap="4" mb="4" alignItems="flex-end">
                        <Box>
                            <styled.label
                                htmlFor="date"
                                display="block"
                                fontSize="sm"
                                fontWeight="medium"
                                color="admin.700"
                                mb="1"
                            >
                                Date
                            </styled.label>
                            <styled.input
                                id="date"
                                name="date"
                                type="date"
                                defaultValue={overrideDateTime?.toISODate() || ''}
                                px="3"
                                py="2"
                                border="admin-subtle"
                                borderRadius="md"
                                fontSize="sm"
                                _focus={{
                                    outline: 'none',
                                    borderColor: 'indigo.7',
                                    boxShadow: 'focus-ring',
                                }}
                            />
                        </Box>

                        <Box>
                            <styled.label
                                htmlFor="time"
                                display="block"
                                fontSize="sm"
                                fontWeight="medium"
                                color="admin.700"
                                mb="1"
                            >
                                Time
                            </styled.label>
                            <styled.input
                                id="time"
                                name="time"
                                type="time"
                                defaultValue={overrideDateTime?.toFormat('HH:mm') || ''}
                                px="3"
                                py="2"
                                border="admin-subtle"
                                borderRadius="md"
                                fontSize="sm"
                                _focus={{
                                    outline: 'none',
                                    borderColor: 'indigo.7',
                                    boxShadow: 'focus-ring',
                                }}
                            />
                        </Box>

                        <Button name="_action" value="setDate" type="submit">
                            Set Override
                        </Button>
                    </Flex>
                </Form>

                {overrideDateTime && (
                    <Flex mt="4" align="center">
                        <Form method="post">
                            <styled.button
                                name="_action"
                                value="clearDate"
                                type="submit"
                                bg="status.danger.fg"
                                color="white"
                                py="2"
                                px="6"
                                borderRadius="md"
                                fontSize="sm"
                                fontWeight="bold"
                                cursor="pointer"
                                boxShadow="sm"
                                _hover={{ bg: 'status.danger.emphasis' }}
                                title="Clear the current date/time override"
                            >
                                Clear Override
                            </styled.button>
                        </Form>
                    </Flex>
                )}

                <Box mt="6" p="4" bg="admin.100" borderRadius="md" fontSize="sm" color="admin.700">
                    <styled.p fontWeight="medium" mb="2" color="admin.900">
                        Note:
                    </styled.p>
                    <styled.ul pl="5" listStyleType="disc">
                        <li>Date override only affects your admin session</li>
                        <li>This allows you to test time-sensitive features like voting</li>
                        <li>Regular users will see the actual current date/time</li>
                        <li>The override persists across page refreshes until cleared</li>
                    </styled.ul>
                </Box>
            </AdminCard>

            {/* Announcements Management */}
            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="6">
                    App Announcements
                </styled.h2>

                {announcement && announcement.isActive && (
                    <Box mb="6" p="4" bg="status.success.bg" borderRadius="md" fontSize="sm">
                        <styled.p fontWeight="medium" color="status.success.fg" mb="2">
                            Current Announcement
                        </styled.p>
                        <styled.p color="status.success.fg" mb="2">
                            {announcement.message}
                        </styled.p>
                        <styled.p color="status.success.emphasis" fontSize="xs">
                            Last updated:{' '}
                            {DateTime.fromISO(announcement.updatedTime || announcement.createdTime, {
                                zone: conferenceManifest.public.timezone,
                            }).toLocaleString(DateTime.DATETIME_SHORT, { locale: 'en-AU' })}
                        </styled.p>
                    </Box>
                )}

                {(!announcement || !announcement.isActive) && (
                    <Box mb="6" p="4" bg="admin.100" borderRadius="md" fontSize="sm">
                        <styled.p color="admin.700">No active announcement</styled.p>
                    </Box>
                )}

                <Form method="post">
                    <styled.h3 fontSize="lg" fontWeight="medium" mb="4">
                        Update Announcement
                    </styled.h3>

                    <Box mb="4">
                        <styled.label
                            htmlFor="announcement"
                            display="block"
                            fontSize="sm"
                            fontWeight="medium"
                            color="admin.700"
                            mb="1"
                        >
                            Message
                        </styled.label>
                        <styled.textarea
                            id="announcement"
                            name="announcement"
                            defaultValue={announcement?.isActive ? announcement.message : ''}
                            rows={3}
                            px="3"
                            py="2"
                            width="full"
                            border="admin-subtle"
                            borderRadius="md"
                            fontSize="sm"
                            _focus={{
                                outline: 'none',
                                borderColor: 'indigo.7',
                                boxShadow: 'focus-ring',
                            }}
                            placeholder="Enter the announcement message that will be shown in the app"
                        />
                    </Box>

                    <Flex gap="4">
                        <Button name="_action" value="updateAnnouncement" type="submit">
                            Update Announcement
                        </Button>
                        {announcement && announcement.isActive && (
                            <styled.button
                                name="_action"
                                value="clearAnnouncement"
                                type="submit"
                                bg="status.danger.fg"
                                color="white"
                                py="2"
                                px="6"
                                borderRadius="md"
                                fontSize="sm"
                                fontWeight="bold"
                                cursor="pointer"
                                boxShadow="sm"
                                _hover={{ bg: 'status.danger.emphasis' }}
                                title="Clear the current announcement"
                            >
                                Clear Announcement
                            </styled.button>
                        )}
                    </Flex>
                </Form>

                <Box mt="6" p="4" bg="admin.100" borderRadius="md" fontSize="sm" color="admin.700">
                    <styled.p fontWeight="medium" mb="2" color="admin.900">
                        Note:
                    </styled.p>
                    <styled.ul pl="5" listStyleType="disc">
                        <li>Announcements are displayed in the mobile app on the day of the conference</li>
                        <li>The message will be shown to all app users</li>
                        <li>Updates are reflected immediately in the app</li>
                        <li>Clear the announcement when it's no longer needed</li>
                    </styled.ul>
                </Box>
            </AdminCard>

            {/* Quick Jump to Important Dates */}
            {importantDates.length > 0 && (
                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="6">
                        Quick Jump to Important Dates ({year})
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600" mb="4">
                        Click any button below to instantly jump to that date/time for testing purposes:
                    </styled.p>
                    <VStack gap="3" alignItems="stretch">
                        {importantDates.map((dateInfo, index) => (
                            <QuickJumpButton
                                key={index}
                                label={dateInfo.event}
                                dateISO={dateInfo.dateTime}
                                timezone={timezone}
                            />
                        ))}
                    </VStack>
                </AdminCard>
            )}
        </AdminLayout>
    )
}

function QuickJumpButton({
    label,
    dateISO,
    timezone,
}: {
    label: string
    dateISO: string | undefined
    timezone: string
}) {
    const date = dateISO ? DateTime.fromISO(dateISO, { zone: timezone }) : DateTime.now().setZone(timezone)

    return (
        <Form method="post">
            <input type="hidden" name="_action" value="jumpToDate" />
            <input type="hidden" name="jumpDate" value={dateISO} />
            <Button type="submit" p="2">
                <styled.div fontWeight="semibold" mb="1">
                    {label}
                </styled.div>
                <styled.div fontSize="xs" opacity="0.9">
                    {date.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'en-AU' })} ({timezone})
                </styled.div>
            </Button>
        </Form>
    )
}

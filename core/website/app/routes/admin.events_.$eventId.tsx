import { data, Form, redirect, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { fieldLabelClass, inputClass, textareaClass } from '~/components/portal-form'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import { conferenceInstant } from '~/lib/dates/temporal'
import { parseEventForm, toDateTimeLocal } from '~/lib/events/event-form'
import { getServices } from '~/remix-app-load-context'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.events_.$eventId'

/** `/admin/events/new` creates; any other id edits that event. */
const NEW = 'new'

export async function loader({ request, context, params }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    if (params.eventId === NEW) return data({ event: null })

    const event = await getServices(context).events.get(params.eventId)
    if (!event) throw data('Event not found', { status: 404 })

    return data({
        event: {
            ...event,
            startsAt: toDateTimeLocal(event.startsAt),
            endsAt: toDateTimeLocal(event.endsAt),
            updated: conferenceInstant(event.updatedAt * 1000).toLocaleString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            }),
        },
    })
}

export async function action({ request, context, params }: Route.ActionArgs) {
    const user = await requireAdmin(request, context)
    const events = getServices(context).events
    const formData = await request.formData()

    if (formData.get('_action') === 'delete' && params.eventId !== NEW) {
        await events.delete(params.eventId)
        return redirect('/admin/events')
    }

    const parsed = parseEventForm(formData)
    if ('errors' in parsed) return data({ errors: parsed.errors }, { status: 400 })

    if (params.eventId === NEW) {
        await events.create(parsed.value, user.email)
    } else if (!(await events.update(params.eventId, parsed.value, user.email))) {
        throw data('Event not found', { status: 404 })
    }
    return redirect('/admin/events')
}

// css() rather than a spread props object, so Panda's static extraction sees it.
const fieldsClass = css({ display: 'grid', gap: '5' })
const twoColumnClass = css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '5' })
const hintClass = css({ display: 'block', fontWeight: 'normal', color: 'admin.600', mt: '1' })

export default function AdminEditEvent() {
    const { event } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const saving = useNavigation().state === 'submitting'

    return (
        <AdminLayout heading={event ? `Edit: ${event.title}` : 'New event'}>
            <AppLink to="/admin/events" unstyled fontSize="sm" color="indigo.9">
                ← All events
            </AppLink>

            {event && (
                <styled.p fontSize="sm" color="admin.600" mt="4">
                    Last saved by {event.updatedBy}, {event.updated}. Event page:{' '}
                    {event.published ? (
                        <AppLink to={`/events/${event.slug}`} unstyled textDecoration="underline" color="indigo.9">
                            /events/{event.slug}
                        </AppLink>
                    ) : (
                        <>/events/{event.slug} (live once published)</>
                    )}
                </styled.p>
            )}

            {actionData?.errors && (
                <Box role="alert" my="6" p="4" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                    <styled.ul pl="5" listStyleType="disc">
                        {actionData.errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </styled.ul>
                </Box>
            )}

            <AdminCard>
                <Form method="post" className={fieldsClass}>
                    <label className={fieldLabelClass}>
                        Title
                        <input className={inputClass} name="title" required defaultValue={event?.title} />
                    </label>

                    <label className={fieldLabelClass}>
                        Description
                        <span className={hintClass}>
                            Shown on the event&apos;s own page, not the home page. Markdown: **bold**, *italic*,
                            [link text](https://…), - bullet lists, ## headings. A blank line starts a new paragraph.
                        </span>
                        <textarea
                            className={textareaClass}
                            name="description"
                            required
                            rows={12}
                            defaultValue={event?.description}
                        />
                    </label>

                    <div className={twoColumnClass}>
                        <label className={fieldLabelClass}>
                            Starts
                            <input
                                className={inputClass}
                                name="startsAt"
                                type="datetime-local"
                                required
                                defaultValue={event?.startsAt}
                            />
                        </label>
                        <label className={fieldLabelClass}>
                            Ends (optional)
                            <input className={inputClass} name="endsAt" type="datetime-local" defaultValue={event?.endsAt} />
                        </label>
                    </div>
                    <styled.p fontSize="sm" color="admin.600" mt="-3">
                        Times are in the conference&apos;s timezone. With no end time, the event stays on the home page
                        until the end of its start day.
                    </styled.p>

                    <div className={twoColumnClass}>
                        <label className={fieldLabelClass}>
                            Location (optional)
                            <input className={inputClass} name="location" defaultValue={event?.location ?? ''} />
                        </label>
                        <label className={fieldLabelClass}>
                            Location link (optional)
                            <span className={hintClass}>Makes the location a link, e.g. to Google Maps.</span>
                            <input
                                className={inputClass}
                                name="locationUrl"
                                type="url"
                                defaultValue={event?.locationUrl ?? ''}
                            />
                        </label>
                    </div>

                    <div className={twoColumnClass}>
                        <label className={fieldLabelClass}>
                            Link (optional)
                            <span className={hintClass}>Registration or more info, e.g. a Meetup or Humanitix page.</span>
                            <input className={inputClass} name="url" type="url" defaultValue={event?.url ?? ''} />
                        </label>
                        <label className={fieldLabelClass}>
                            Link text (optional)
                            <span className={hintClass}>Defaults to &ldquo;Find out more&rdquo;.</span>
                            <input className={inputClass} name="linkLabel" defaultValue={event?.linkLabel ?? ''} />
                        </label>
                    </div>

                    <styled.label display="flex" gap="2" alignItems="center" fontSize="sm" fontWeight="medium">
                        <input type="checkbox" name="published" defaultChecked={event?.published ?? false} />
                        Published — show it on the home page
                    </styled.label>

                    <div>
                        <Button type="submit" name="_action" value="save" loading={saving}>
                            {event ? 'Save event' : 'Create event'}
                        </Button>
                    </div>
                </Form>
            </AdminCard>

            {event && (
                <Form method="post">
                    <Flex mt="8" gap="4" align="center" wrap="wrap">
                        <Button
                            type="submit"
                            name="_action"
                            value="delete"
                            variant="outline"
                            onClick={(e) => {
                                if (!confirm(`Delete "${event.title}"? This can't be undone.`)) e.preventDefault()
                            }}
                        >
                            Delete event
                        </Button>
                        <styled.p fontSize="sm" color="admin.600">
                            To just hide it, untick Published instead.
                        </styled.p>
                    </Flex>
                </Form>
            )}
        </AdminLayout>
    )
}

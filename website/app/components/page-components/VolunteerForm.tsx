import { useScript } from '@uidotdev/usehooks'
import { useEffect } from 'react'
import type { ConferenceState } from '~/lib/conference-state-client-safe'

declare const SmFormSettings: any

export function VolunteerForm({ conferenceState }: { conferenceState: ConferenceState }) {
    if (!conferenceState.volunteering.needsVolunteers) {
        return null
    }

    if (conferenceState.volunteering.form?.type === 'salesmate') {
        return (
            <SalesMateForm
                linkName={conferenceState.volunteering.form.linkName}
                formId={conferenceState.volunteering.form.formId}
            />
        )
    } else if (conferenceState.volunteering.form?.type === 'tito') {
        return (
            <div className="my-4">
                <a
                    href={conferenceState.volunteering.form.ticketUrl}
                    className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Register as a Volunteer
                </a>
            </div>
        )
    }

    return null
}

export function SalesMateForm({ linkName, formId }: { linkName: string; formId: string }) {
    const status = useScript(`https://${linkName}/webforms.js`, {
        removeOnUnmount: false,
    })

    useEffect(() => {
        if (status === 'ready' && typeof SmFormSettings !== 'undefined') {
            SmFormSettings.loadForm({
                divId: '_sm_webform_',
                linkName,
                formId,
            })
        }
    }, [formId, linkName, status])

    return (
        <div id="volunteer_form">
            <div id="_sm_webform_"></div>
        </div>
    )
}

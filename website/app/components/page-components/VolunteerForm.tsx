import { useScript } from '@uidotdev/usehooks'
import { useEffect } from 'react'
import type { ConferenceConfig } from '~/lib/config-types'
import { conferenceConfig } from '../../config/conference-config'

declare const SmFormSettings: any

export const VolunteerForm = () => {
    const config: ConferenceConfig = conferenceConfig
    if (config.volunteerForm?.type === 'salesmate') {
        return <SalesMateForm linkName={config.volunteerForm.linkName} formId={config.volunteerForm.formId} />
    } else if (config.volunteerForm?.type === 'tito') {
        return (
            <div className="my-4">
                <a
                    href={config.volunteerForm.ticketUrl}
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

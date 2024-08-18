import { useScript } from '@uidotdev/usehooks'
import { useEffect } from 'react'
import { conferenceConfig } from '../../config/conference-config'

declare const SmFormSettings: any

export const VolunteerForm = () => {
    if (conferenceConfig.volunteerForm?.type === 'salesmate') {
        return (
            <SalesMateForm
                linkName={conferenceConfig.volunteerForm.linkName}
                formId={conferenceConfig.volunteerForm.formId}
            />
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

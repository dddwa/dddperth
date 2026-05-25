import { useEffect, useState } from 'react'
import type { ConferenceState } from '~/lib/conference-state-client-safe'

declare global {
    interface Window {
        SmFormSettings?: {
            loadForm(opts: { divId: string; linkName: string; formId: string }): void
        }
    }
}

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
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const src = `https://${linkName}/webforms.js`
        const dataKey = `salesmate-${linkName}`

        if (window.SmFormSettings) {
            setReady(true)
            return
        }

        let scriptTag = document.querySelector<HTMLScriptElement>(`script[data-form="${dataKey}"]`)
        if (!scriptTag) {
            scriptTag = document.createElement('script')
            scriptTag.src = src
            scriptTag.async = true
            scriptTag.dataset.form = dataKey
            document.head.appendChild(scriptTag)
        }

        const onLoad = () => setReady(!!window.SmFormSettings)
        scriptTag.addEventListener('load', onLoad)

        return () => {
            scriptTag.removeEventListener('load', onLoad)
        }
    }, [linkName])

    useEffect(() => {
        if (ready && window.SmFormSettings) {
            window.SmFormSettings.loadForm({ divId: '_sm_webform_', linkName, formId })
        }
    }, [ready, linkName, formId])

    return (
        <div id="volunteer_form">
            <div id="_sm_webform_" />
        </div>
    )
}

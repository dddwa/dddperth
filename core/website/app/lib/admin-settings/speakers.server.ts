import type { RouterContext } from 'react-router'
import { getConfig, getConferenceState, getServices } from '~/remix-app-load-context'
import { resolveSpeakerSettings, speakerSettingsFromConfig, type ResolvedSpeakerSettings, type SpeakerSettings } from './speakers'

type Context = { get<T>(context: RouterContext<T>): T }

/** The config-derived values, used until an admin saves the section. The
 * ticket claim URL comes from the `SPEAKER_TICKET_CLAIM_URL_<YEAR>` secret. */
export function speakerSettingsFallback(context: Context): SpeakerSettings {
    const year = getConferenceState(context).conference.year
    return speakerSettingsFromConfig(getConfig(context).speakerTicketClaimUrls[year])
}

/** The speaker settings every speaker/sponsor portal page should use: the
 * saved /admin/settings/speakers values, else the config fallback. */
export async function loadSpeakerSettings(context: Context): Promise<ResolvedSpeakerSettings> {
    const saved = await getServices(context).adminSettings.get('speakers')
    return resolveSpeakerSettings(saved?.value ?? speakerSettingsFallback(context))
}

/** Whether any Meet the Experts slots are set — the sponsor portal hides the
 * feature entirely when there are none. */
export async function isMeetTheExpertsOffered(context: Context): Promise<boolean> {
    return (await loadSpeakerSettings(context)).meetTheExpertsSlots.length > 0
}

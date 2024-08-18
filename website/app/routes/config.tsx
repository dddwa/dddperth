import { conferenceConfig } from '../config/conference-config'

/** This route is used by the app or integrations to understand the state of the conference */
export function loader(): AppConfig {
    return {
        conferenceDate: conferenceConfig.current.conferenceDate?.toISOString() ?? null,
    }
}

interface AppConfig {
    conferenceDate: string | null
}

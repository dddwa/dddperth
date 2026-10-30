import { createConferenceDates } from '@ddd/conference-config'
import { conferenceConfigPublic } from './public.ts'

export const { conferenceTime } = createConferenceDates(conferenceConfigPublic.timezone)

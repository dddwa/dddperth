export interface StartEventImportantDate {
    type: 'start-event'
    dateTime: string
    endDateTime: string
    event: string

    eventActiveMessage: string
    eventActiveHref?: string
    eventClosedMessage: string
}

export interface StandaloneImportantDate {
    type: 'important-date'

    dateTime: string

    event: string

    eventHref?: string

    eventClosedMessage: string
    eventClosedHref?: string

    onDayMessage?: string
    onDayHref?: string
}

export type ImportantDate = StartEventImportantDate | StandaloneImportantDate

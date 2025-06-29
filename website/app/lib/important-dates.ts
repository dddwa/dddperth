export interface StartEventImportantDate {
    type: 'start-event'
    dateTime: string
    endDateTime: string
    event: string

    eventActiveMessage: string
    eventActiveHref?: string
    eventClosedMessage: string
}

export interface EndEventImportantDate {
    type: 'end-event'
    startDateTime: string
    dateTime: string
    event: string

    /** End events count down while active, so no active message */
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

export type ImportantDate = StartEventImportantDate | EndEventImportantDate | StandaloneImportantDate

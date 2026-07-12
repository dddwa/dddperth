/**
 * Send-once bookkeeping for operational notifications (e.g. Jira token
 * expiry reminders). Keys are caller-defined and unique per notification —
 * `markSent` after a successful send stops hourly cron runs repeating it.
 */
export interface NotificationLog {
    wasSent(key: string): Promise<boolean>
    markSent(key: string): Promise<void>
}

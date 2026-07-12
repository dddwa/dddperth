import type { NotificationLog } from '../notification-log'

export function createD1NotificationLog(db: D1Database): NotificationLog {
    return {
        async wasSent(key) {
            const row = await db.prepare('SELECT 1 FROM notification_log WHERE key = ? LIMIT 1').bind(key).first()
            return row !== null
        },

        async markSent(key) {
            await db
                .prepare('INSERT OR IGNORE INTO notification_log (key, sent_at) VALUES (?, unixepoch())')
                .bind(key)
                .run()
        },
    }
}

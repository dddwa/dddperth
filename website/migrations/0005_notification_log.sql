-- Generic send-once bookkeeping for operational notifications (first user:
-- Jira API token expiry reminders). A row per notification key means "this
-- was already sent" — senders check before emailing so hourly cron runs
-- don't repeat themselves.

CREATE TABLE IF NOT EXISTS notification_log (
    key TEXT PRIMARY KEY,
    sent_at INTEGER NOT NULL
);

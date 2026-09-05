-- Speaker portal: drop the Jira dependency
--
-- Speaker contact emails (who may log in as a given speaker) are now added
-- and removed directly by an admin at /admin/speakers instead of being
-- synced from a Jira speaker issue's email field, and speakers no longer
-- link to a Jira issue at all. Nothing has been synced through the old
-- Jira path yet (pre-launch), so this is a straight column drop rather than
-- a data migration.

ALTER TABLE speakers DROP COLUMN jira_issue_key;
ALTER TABLE speaker_sync_runs DROP COLUMN contacts_added;
ALTER TABLE speaker_sync_runs DROP COLUMN contacts_removed;

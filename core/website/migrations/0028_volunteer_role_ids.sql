-- Volunteer role ids now match the Jira "Volunteer Team" labels minus their
-- `team-` prefix (`team-room-coordinators` -> `room-coordinators`), so the run
-- sheet can find a team's role — and its /admin/settings/volunteers links —
-- without a mapping. Renames the old ids wherever they're stored.
--
-- `roles_json` and the settings JSON are rewritten as text: both only ever
-- hold these ids as whole quoted strings, and the closing quote in each
-- pattern keeps `"photographer"` from matching inside `"photographers"`.

UPDATE volunteer_assignments SET role = 'room-coordinators' WHERE role = 'room_coordinator';
UPDATE volunteer_assignments SET role = 'photographers' WHERE role = 'photographer';

UPDATE volunteers
SET roles_json = REPLACE(REPLACE(roles_json, '"room_coordinator"', '"room-coordinators"'), '"photographer"', '"photographers"');

UPDATE admin_settings
SET value_json = REPLACE(REPLACE(value_json, '"room_coordinator":', '"room-coordinators":'), '"photographer":', '"photographers":')
WHERE section = 'volunteers';

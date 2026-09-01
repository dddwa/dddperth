-- Speaker portal: stop duplicating Sessionize content into D1
--
-- speakers/speaker_sessions now hold IDs + linkage only. All Sessionize-
-- sourced display content (name, bio, tagline, photo, links; session title,
-- description, category values, schedule slot, room, status, confirmation)
-- is read live from Sessionize at request time and merged with these rows
-- by sessionize_id, instead of being copied in by the hourly sync. Nothing
-- here held user-submitted data — it's all reproducible from the next sync
-- — so a straight column drop is safe.

ALTER TABLE speakers DROP COLUMN full_name;
ALTER TABLE speakers DROP COLUMN tag_line;
ALTER TABLE speakers DROP COLUMN bio;
ALTER TABLE speakers DROP COLUMN profile_picture_url;
ALTER TABLE speakers DROP COLUMN links_json;

ALTER TABLE speaker_sessions DROP COLUMN session_title;
ALTER TABLE speaker_sessions DROP COLUMN description;
ALTER TABLE speaker_sessions DROP COLUMN format;
ALTER TABLE speaker_sessions DROP COLUMN level;
ALTER TABLE speaker_sessions DROP COLUMN general_topic;
ALTER TABLE speaker_sessions DROP COLUMN talk_topics_json;
ALTER TABLE speaker_sessions DROP COLUMN starts_at;
ALTER TABLE speaker_sessions DROP COLUMN ends_at;
ALTER TABLE speaker_sessions DROP COLUMN room_name;
ALTER TABLE speaker_sessions DROP COLUMN status;
ALTER TABLE speaker_sessions DROP COLUMN is_confirmed;

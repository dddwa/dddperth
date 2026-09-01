-- Speaker portal: session details + speaker links
--
-- Adds the extra Sessionize-sourced fields needed for the speaker dashboard:
-- session description plus its category values (format/level/general topic/
-- talk topics — matched by Sessionize category *name*, since category ids
-- aren't stable across events), and each speaker's links (Twitter/LinkedIn/
-- other). Categories and links are variable-shape per event, so talk topics
-- (multi-select) and links store as JSON rather than fixed columns.

ALTER TABLE speaker_sessions ADD COLUMN description TEXT;
ALTER TABLE speaker_sessions ADD COLUMN format TEXT;
ALTER TABLE speaker_sessions ADD COLUMN level TEXT;
ALTER TABLE speaker_sessions ADD COLUMN general_topic TEXT;
ALTER TABLE speaker_sessions ADD COLUMN talk_topics_json TEXT;

ALTER TABLE speakers ADD COLUMN links_json TEXT;

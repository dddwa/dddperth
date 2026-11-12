-- Responses to the hidden surveys at /survey/<slug>. Surveys and their
-- questions are defined in the conference manifest (`surveys`), not here.
--
-- `answers` is JSON: `{ "answers": { <questionId>: <answer> }, "others": {
-- <questionId>: <text> } }`, where an answer is a string (single choice or
-- text), a string array (multiple choice) or a number (1–5 scale), and
-- `others` holds what was typed into an "Other" box. Questions left blank are
-- absent. Stored as JSON so a survey's questions can change without a
-- migration; see `app/lib/surveys/survey-response.ts`.
--
-- Anonymous unless the respondent chose to leave `email`. Every response is
-- kept: there's no identity to dedupe on, and the spam checks run before this.

CREATE TABLE IF NOT EXISTS survey_responses (
    id TEXT PRIMARY KEY,
    survey_slug TEXT NOT NULL,
    answers TEXT NOT NULL,
    email TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_slug ON survey_responses (survey_slug, created_at);

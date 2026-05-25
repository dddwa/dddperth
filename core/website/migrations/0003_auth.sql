-- Magic-link authentication
--
-- Three tables:
--   auth_allowlist     — emails permitted to log in
--   auth_login_tokens  — one-time tokens issued by the login form (stored hashed)
--   auth_sessions      — server-side session records keyed by opaque cookie id

CREATE TABLE IF NOT EXISTS auth_allowlist (
    email TEXT PRIMARY KEY,
    name TEXT,
    added_at INTEGER NOT NULL,
    added_by TEXT
);

CREATE TABLE IF NOT EXISTS auth_login_tokens (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    consumed_at INTEGER,
    redirect_to TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_login_tokens_email ON auth_login_tokens(email);
CREATE INDEX IF NOT EXISTS idx_auth_login_tokens_expires_at ON auth_login_tokens(expires_at);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_email ON auth_sessions(email);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- Seed the initial admin so login works immediately. Add others via D1.
INSERT OR IGNORE INTO auth_allowlist (email, name, added_at, added_by)
VALUES ('jake@ginnivan.net', 'Jake Ginnivan', unixepoch(), 'migration');

-- 00001_init_schema.sql
-- Initial schema for PeopleVault: a privacy-first personal relationship manager.
-- All user-owned data is scoped by owner_user_id for multi-tenant-ready isolation.
-- Uses UUID primary keys (gen_random_uuid()) and timestamptz with default now().

-- +goose Up
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           citext NOT NULL UNIQUE,
    password_hash   text NOT NULL,
    name            text,
    email_verified_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
CREATE TABLE user_settings (
    user_id                   uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    nameday_country           text NOT NULL DEFAULT 'CZ',
    theme                     text NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
    default_reminder_lead_days int  NOT NULL DEFAULT 7,
    onboarded                 boolean NOT NULL DEFAULT false,
    updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  text NOT NULL UNIQUE,
    remember_me boolean NOT NULL DEFAULT false,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    ip          text,
    user_agent  text
);
CREATE INDEX idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- ---------------------------------------------------------------------------
-- people
-- ---------------------------------------------------------------------------
CREATE TABLE people (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name       text NOT NULL,
    nickname        text,
    avatar_url      text,
    relationship    text,
    birthday        date,
    anniversary     date,
    nameday_country text,
    nameday_month   int,
    nameday_day     int,
    age_visible     boolean NOT NULL DEFAULT true,
    address         text,
    phone           text,
    email           citext,
    notes           text,
    favorite_things text,
    gift_ideas      text,
    interests       text,
    is_favorite     boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_people_owner    ON people(owner_user_id);
CREATE INDEX idx_people_owner_name_bday ON people(owner_user_id, birthday);
CREATE INDEX people_name_trgm ON people USING gin (full_name gin_trgm_ops, nickname gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- custom_fields
-- ---------------------------------------------------------------------------
CREATE TABLE custom_fields (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id  uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    key        text NOT NULL,
    value      text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_custom_fields_person_id ON custom_fields(person_id);

-- ---------------------------------------------------------------------------
-- social_links
-- ---------------------------------------------------------------------------
CREATE TABLE social_links (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id  uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    platform   text NOT NULL,
    url        text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_social_links_person_id ON social_links(person_id);

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
CREATE TABLE tags (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE(owner_user_id, name)
);

-- ---------------------------------------------------------------------------
-- person_tags
-- ---------------------------------------------------------------------------
CREATE TABLE person_tags (
    person_id uuid REFERENCES people(id) ON DELETE CASCADE,
    tag_id    uuid REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY(person_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- relationships
-- ---------------------------------------------------------------------------
CREATE TABLE relationships (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    to_person_id   uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    kind          text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (from_person_id <> to_person_id)
);
CREATE INDEX idx_relationships_owner       ON relationships(owner_user_id);
CREATE INDEX idx_relationships_from_person ON relationships(from_person_id);
CREATE INDEX idx_relationships_to_person   ON relationships(to_person_id);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
CREATE TABLE events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    person_id     uuid REFERENCES people(id) ON DELETE CASCADE,
    title         text NOT NULL,
    type          text NOT NULL CHECK (type IN ('birthday','anniversary','nameday','wedding','graduation','holiday','custom')),
    event_date    date NOT NULL,
    is_recurring  boolean NOT NULL DEFAULT false,
    recurrence_rule text,
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_owner      ON events(owner_user_id);
CREATE INDEX idx_events_person     ON events(person_id);
CREATE INDEX idx_events_event_date ON events(event_date);

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------
CREATE TABLE reminders (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    lead_days     int NOT NULL DEFAULT 0,
    fired_at      timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reminders_owner   ON reminders(owner_user_id);
CREATE INDEX idx_reminders_event   ON reminders(event_id);

-- ---------------------------------------------------------------------------
-- timeline_entries
-- ---------------------------------------------------------------------------
CREATE TABLE timeline_entries (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id     uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          text NOT NULL CHECK (type IN ('birthday','anniversary','met','gift','vacation','achievement','memory','photo','reminder','note')),
    title         text,
    body          text,
    occurred_on   date,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_timeline_person        ON timeline_entries(person_id);
CREATE INDEX idx_timeline_person_occurred ON timeline_entries(person_id, occurred_on DESC);

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------
CREATE TABLE attachments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id     uuid REFERENCES people(id) ON DELETE CASCADE,
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind          text NOT NULL CHECK (kind IN ('photo','document','voice')),
    filename      text NOT NULL,
    storage_key   text NOT NULL,
    mime_type     text,
    size_bytes    bigint,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_person ON attachments(person_id);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
    id         bigserial PRIMARY KEY,
    user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
    action     text NOT NULL,
    entity     text,
    entity_id  uuid,
    ip         text,
    meta       jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- +goose Down
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS timeline_entries;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS relationships;
DROP TABLE IF EXISTS person_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS social_links;
DROP TABLE IF EXISTS custom_fields;
DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS users;

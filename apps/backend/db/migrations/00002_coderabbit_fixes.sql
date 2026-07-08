-- 00002_coderabbit_fixes.sql
-- Schema hardening from CodeRabbit review:
--   * sessions(expires_at) index for cleanup queries
--   * people indexes for dashboard/nameday queries
--   * CHECK constraints for nameday_month / nameday_day
--   * reusable updated_at trigger function + BEFORE UPDATE triggers

-- +goose Up
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_people_owner_anniversary ON people(owner_user_id, anniversary);
CREATE INDEX IF NOT EXISTS idx_people_owner_nameday    ON people(owner_user_id, nameday_month, nameday_day);

ALTER TABLE people
    ADD CONSTRAINT chk_nameday_month
    CHECK (nameday_month IS NULL OR (nameday_month >= 1 AND nameday_month <= 12));
ALTER TABLE people
    ADD CONSTRAINT chk_nameday_day
    CHECK (nameday_day IS NULL OR (nameday_day >= 1 AND nameday_day <= 31));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at          ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at  ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_people_updated_at         ON people;
CREATE TRIGGER trg_people_updated_at
    BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_events_updated_at         ON events;
CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_timeline_entries_updated_at ON timeline_entries;
CREATE TRIGGER trg_timeline_entries_updated_at
    BEFORE UPDATE ON timeline_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
DROP TRIGGER IF EXISTS trg_timeline_entries_updated_at ON timeline_entries;
DROP TRIGGER IF EXISTS trg_events_updated_at          ON events;
DROP TRIGGER IF EXISTS trg_people_updated_at          ON people;
DROP TRIGGER IF EXISTS trg_user_settings_updated_at   ON user_settings;
DROP TRIGGER IF EXISTS trg_users_updated_at           ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

ALTER TABLE people DROP CONSTRAINT IF EXISTS chk_nameday_day;
ALTER TABLE people DROP CONSTRAINT IF EXISTS chk_nameday_month;

DROP INDEX IF EXISTS idx_people_owner_nameday;
DROP INDEX IF EXISTS idx_people_owner_anniversary;
DROP INDEX IF EXISTS idx_sessions_expires_at;

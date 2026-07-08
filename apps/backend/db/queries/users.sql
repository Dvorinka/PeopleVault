-- users.sql
-- User accounts and per-user settings. Settings are upserted by user_id.

-- name: CreateUser :one
INSERT INTO users (email, password_hash, name)
VALUES (sqlc.arg('email'), sqlc.arg('password_hash'), sqlc.arg('name'))
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = sqlc.arg('email');

-- name: GetUserByID :one
SELECT * FROM users WHERE id = sqlc.arg('id');

-- name: UpdateUserPasswordHash :exec
UPDATE users
SET password_hash = sqlc.arg('password_hash'), updated_at = now()
WHERE id = sqlc.arg('id');

-- name: VerifyEmail :exec
UPDATE users
SET email_verified_at = now(), updated_at = now()
WHERE id = sqlc.arg('id');

-- name: UpdateUserSettings :one
INSERT INTO user_settings (
    user_id, nameday_country, theme, default_reminder_lead_days, onboarded
)
VALUES (
    sqlc.arg('user_id'),
    sqlc.arg('nameday_country'),
    sqlc.arg('theme'),
    sqlc.arg('default_reminder_lead_days'),
    sqlc.arg('onboarded')
)
ON CONFLICT (user_id) DO UPDATE SET
    nameday_country           = EXCLUDED.nameday_country,
    theme                     = EXCLUDED.theme,
    default_reminder_lead_days = EXCLUDED.default_reminder_lead_days,
    onboarded                 = EXCLUDED.onboarded,
    updated_at                = now()
RETURNING *;

-- name: GetUserSettings :one
SELECT * FROM user_settings WHERE user_id = sqlc.arg('user_id');

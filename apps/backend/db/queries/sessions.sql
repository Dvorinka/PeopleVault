-- sessions.sql
-- Authenticated session lifecycle. Token is stored hashed for safety.

-- name: CreateSession :one
INSERT INTO sessions (user_id, token_hash, remember_me, expires_at, ip, user_agent)
VALUES (
    sqlc.arg('user_id'),
    sqlc.arg('token_hash'),
    sqlc.arg('remember_me'),
    sqlc.arg('expires_at'),
    sqlc.arg('ip'),
    sqlc.arg('user_agent')
)
RETURNING *;

-- name: GetSessionByTokenHash :one
SELECT * FROM sessions WHERE token_hash = sqlc.arg('token_hash');

-- name: DeleteSession :exec
DELETE FROM sessions WHERE id = sqlc.arg('id');

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions WHERE expires_at < now();

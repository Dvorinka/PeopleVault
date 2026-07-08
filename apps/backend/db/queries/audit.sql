-- audit.sql
-- Append-only audit log for security-relevant user actions.

-- name: CreateAuditLog :one
INSERT INTO audit_log (user_id, action, entity, entity_id, ip, meta)
VALUES (
    sqlc.arg('user_id'),
    sqlc.arg('action'),
    sqlc.arg('entity'),
    sqlc.arg('entity_id'),
    sqlc.arg('ip'),
    sqlc.arg('meta')
)
RETURNING *;

-- name: ListAuditLogByUser :many
SELECT * FROM audit_log
WHERE user_id = sqlc.arg('user_id')
ORDER BY created_at DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

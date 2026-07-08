-- timeline.sql
-- Per-person timeline entries, scoped by owner_user_id.

-- name: CreateTimelineEntry :one
INSERT INTO timeline_entries (
    person_id, owner_user_id, type, title, body, occurred_on
)
VALUES (
    sqlc.arg('person_id'),
    sqlc.arg('owner_user_id'),
    sqlc.arg('type'),
    sqlc.arg('title'),
    sqlc.arg('body'),
    sqlc.arg('occurred_on')
)
RETURNING *;

-- name: ListTimelineByPerson :many
SELECT * FROM timeline_entries
WHERE person_id = sqlc.arg('person_id') AND owner_user_id = sqlc.arg('owner_user_id')
ORDER BY occurred_on DESC NULLS LAST, created_at DESC;

-- name: DeleteTimelineEntry :exec
DELETE FROM timeline_entries
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

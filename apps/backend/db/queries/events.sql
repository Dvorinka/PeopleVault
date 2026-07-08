-- events.sql
-- Dated events tied to people, scoped by owner_user_id.

-- name: CreateEvent :one
INSERT INTO events (
    owner_user_id, person_id, title, type, event_date,
    is_recurring, recurrence_rule, notes
)
VALUES (
    sqlc.arg('owner_user_id'),
    sqlc.arg('person_id'),
    sqlc.arg('title'),
    sqlc.arg('type'),
    sqlc.arg('event_date'),
    COALESCE(sqlc.arg('is_recurring'), false),
    sqlc.arg('recurrence_rule'),
    sqlc.arg('notes')
)
RETURNING *;

-- name: GetEventByID :one
SELECT * FROM events
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

-- name: ListEventsByOwner :many
SELECT * FROM events
WHERE owner_user_id = sqlc.arg('owner_user_id')
ORDER BY event_date DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: ListEventsByPerson :many
SELECT * FROM events
WHERE person_id = sqlc.arg('person_id') AND owner_user_id = sqlc.arg('owner_user_id')
ORDER BY event_date DESC;

-- name: ListUpcomingEvents :many
SELECT * FROM events
WHERE owner_user_id = sqlc.arg('owner_user_id')
  AND event_date >= current_date
  AND event_date <= current_date + sqlc.arg('days_ahead')::int
ORDER BY event_date;

-- name: UpdateEvent :one
UPDATE events SET
    person_id       = sqlc.arg('person_id'),
    title           = sqlc.arg('title'),
    type            = sqlc.arg('type'),
    event_date      = sqlc.arg('event_date'),
    is_recurring    = COALESCE(sqlc.arg('is_recurring'), false),
    recurrence_rule = sqlc.arg('recurrence_rule'),
    notes           = sqlc.arg('notes'),
    updated_at      = now()
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id')
RETURNING *;

-- name: DeleteEvent :exec
DELETE FROM events
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

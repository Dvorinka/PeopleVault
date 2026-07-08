-- reminders.sql
-- Reminders for events, scoped by owner_user_id. Pending = not yet fired and due.

-- name: CreateReminder :one
INSERT INTO reminders (owner_user_id, event_id, lead_days)
VALUES (sqlc.arg('owner_user_id'), sqlc.arg('event_id'), sqlc.arg('lead_days'))
RETURNING *;

-- name: ListRemindersByOwner :many
SELECT * FROM reminders
WHERE owner_user_id = sqlc.arg('owner_user_id')
ORDER BY created_at DESC;

-- name: ListPendingReminders :many
-- A reminder is due when (event_date - lead_days) <= now() and not yet fired.
SELECT r.*
FROM reminders r
JOIN events e ON e.id = r.event_id
WHERE r.owner_user_id = sqlc.arg('owner_user_id')
  AND r.fired_at IS NULL
  AND (e.event_date - (r.lead_days || ' days')::interval) <= now()
ORDER BY e.event_date;

-- name: MarkReminderFired :exec
UPDATE reminders
SET fired_at = now()
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

-- name: ListRemindersByEvent :many
SELECT * FROM reminders
WHERE event_id = sqlc.arg('event_id') AND owner_user_id = sqlc.arg('owner_user_id')
ORDER BY lead_days;

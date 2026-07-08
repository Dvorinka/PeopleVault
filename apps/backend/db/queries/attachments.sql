-- attachments.sql
-- File attachments tied to people, scoped by owner_user_id.

-- name: CreateAttachment :one
INSERT INTO attachments (
    person_id, owner_user_id, kind, filename, storage_key, mime_type, size_bytes
)
VALUES (
    sqlc.arg('person_id'),
    sqlc.arg('owner_user_id'),
    sqlc.arg('kind'),
    sqlc.arg('filename'),
    sqlc.arg('storage_key'),
    sqlc.arg('mime_type'),
    sqlc.arg('size_bytes')
)
RETURNING *;

-- name: ListAttachmentsByPerson :many
SELECT * FROM attachments
WHERE person_id = sqlc.arg('person_id') AND owner_user_id = sqlc.arg('owner_user_id')
ORDER BY created_at DESC;

-- name: DeleteAttachment :exec
DELETE FROM attachments
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

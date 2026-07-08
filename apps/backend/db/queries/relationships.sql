-- relationships.sql
-- Directed relationships between people, scoped by owner_user_id.

-- name: CreateRelationship :one
INSERT INTO relationships (owner_user_id, from_person_id, to_person_id, kind)
VALUES (
    sqlc.arg('owner_user_id'),
    sqlc.arg('from_person_id'),
    sqlc.arg('to_person_id'),
    sqlc.arg('kind')
)
RETURNING *;

-- name: ListRelationshipsForPerson :many
SELECT * FROM relationships
WHERE owner_user_id = sqlc.arg('owner_user_id')
  AND (from_person_id = sqlc.arg('person_id') OR to_person_id = sqlc.arg('person_id'))
ORDER BY created_at DESC;

-- name: DeleteRelationship :exec
DELETE FROM relationships
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

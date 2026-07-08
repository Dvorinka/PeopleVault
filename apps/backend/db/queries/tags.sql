-- tags.sql
-- Owner-scoped tags and person/tag associations.

-- name: CreateTag :one
INSERT INTO tags (owner_user_id, name)
VALUES (sqlc.arg('owner_user_id'), sqlc.arg('name'))
RETURNING *;

-- name: ListTagsByOwner :many
SELECT * FROM tags
WHERE owner_user_id = sqlc.arg('owner_user_id')
ORDER BY name;

-- name: DeleteTag :exec
DELETE FROM tags
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

-- name: AttachTagToPerson :exec
INSERT INTO person_tags (person_id, tag_id)
VALUES (sqlc.arg('person_id'), sqlc.arg('tag_id'))
ON CONFLICT DO NOTHING;

-- name: DetachTagFromPerson :exec
DELETE FROM person_tags
WHERE person_id = sqlc.arg('person_id') AND tag_id = sqlc.arg('tag_id');

-- name: ListTagsForPerson :many
SELECT t.* FROM tags t
JOIN person_tags pt ON pt.tag_id = t.id
WHERE pt.person_id = sqlc.arg('person_id')
  AND t.owner_user_id = sqlc.arg('owner_user_id')
ORDER BY t.name;

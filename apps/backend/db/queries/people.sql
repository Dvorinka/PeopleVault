-- people.sql
-- Core people records, scoped by owner_user_id for privacy isolation.
-- Includes fuzzy search (pg_trgm), upcoming birthdays, and favorites.

-- name: CreatePerson :one
INSERT INTO people (
    owner_user_id, full_name, nickname, avatar_url, relationship,
    birthday, anniversary, nameday_country, nameday_month, nameday_day,
    age_visible, address, phone, email, notes, favorite_things,
    gift_ideas, interests, is_favorite
)
VALUES (
    sqlc.arg('owner_user_id'),
    sqlc.arg('full_name'),
    sqlc.arg('nickname'),
    sqlc.arg('avatar_url'),
    sqlc.arg('relationship'),
    sqlc.arg('birthday'),
    sqlc.arg('anniversary'),
    sqlc.arg('nameday_country'),
    sqlc.arg('nameday_month'),
    sqlc.arg('nameday_day'),
    COALESCE(sqlc.arg('age_visible'), true),
    sqlc.arg('address'),
    sqlc.arg('phone'),
    sqlc.arg('email'),
    sqlc.arg('notes'),
    sqlc.arg('favorite_things'),
    sqlc.arg('gift_ideas'),
    sqlc.arg('interests'),
    COALESCE(sqlc.arg('is_favorite'), false)
)
RETURNING *;

-- name: GetPersonByID :one
SELECT * FROM people
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

-- name: ListPeopleByOwner :many
SELECT * FROM people
WHERE owner_user_id = sqlc.arg('owner_user_id')
ORDER BY full_name
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: UpdatePerson :one
UPDATE people SET
    full_name       = sqlc.arg('full_name'),
    nickname        = sqlc.arg('nickname'),
    avatar_url      = sqlc.arg('avatar_url'),
    relationship    = sqlc.arg('relationship'),
    birthday        = sqlc.arg('birthday'),
    anniversary     = sqlc.arg('anniversary'),
    nameday_country = sqlc.arg('nameday_country'),
    nameday_month   = sqlc.arg('nameday_month'),
    nameday_day     = sqlc.arg('nameday_day'),
    age_visible     = COALESCE(sqlc.arg('age_visible'), true),
    address         = sqlc.arg('address'),
    phone           = sqlc.arg('phone'),
    email           = sqlc.arg('email'),
    notes           = sqlc.arg('notes'),
    favorite_things = sqlc.arg('favorite_things'),
    gift_ideas      = sqlc.arg('gift_ideas'),
    interests       = sqlc.arg('interests'),
    is_favorite     = COALESCE(sqlc.arg('is_favorite'), false),
    updated_at      = now()
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id')
RETURNING *;

-- name: DeletePerson :exec
DELETE FROM people
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

-- name: SearchPeople :many
SELECT * FROM people
WHERE owner_user_id = sqlc.arg('owner_user_id')
  AND (
    full_name ILIKE '%' || sqlc.arg('query') || '%'
    OR nickname ILIKE '%' || sqlc.arg('query') || '%'
    OR notes ILIKE '%' || sqlc.arg('query') || '%'
    OR interests ILIKE '%' || sqlc.arg('query') || '%'
    OR full_name % sqlc.arg('query')
    OR nickname % sqlc.arg('query')
  )
ORDER BY full_name
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: ListUpcomingBirthdays :many
-- Computes the next birthday occurrence (this year or next year if past)
-- and returns people whose next birthday falls within `days_ahead` days.
SELECT *,
    CASE
        WHEN make_date(extract(year FROM now())::int,
                       extract(month FROM birthday)::int,
                       extract(day FROM birthday)::int) >= current_date
        THEN make_date(extract(year FROM now())::int,
                       extract(month FROM birthday)::int,
                       extract(day FROM birthday)::int)
        ELSE make_date(extract(year FROM now())::int + 1,
                       extract(month FROM birthday)::int,
                       extract(day FROM birthday)::int)
    END AS next_birthday
FROM people
WHERE owner_user_id = sqlc.arg('owner_user_id')
  AND birthday IS NOT NULL
  AND (
    CASE
        WHEN make_date(extract(year FROM now())::int,
                       extract(month FROM birthday)::int,
                       extract(day FROM birthday)::int) >= current_date
        THEN make_date(extract(year FROM now())::int,
                       extract(month FROM birthday)::int,
                       extract(day FROM birthday)::int)
        ELSE make_date(extract(year FROM now())::int + 1,
                       extract(month FROM birthday)::int,
                       extract(day FROM birthday)::int)
    END
  ) <= current_date + sqlc.arg('days_ahead')::int
ORDER BY next_birthday;

-- name: ListRecentlyAddedByOwner :many
SELECT * FROM people
WHERE owner_user_id = sqlc.arg('owner_user_id')
ORDER BY created_at DESC
LIMIT sqlc.arg('limit');

-- name: SetFavorite :exec
UPDATE people
SET is_favorite = sqlc.arg('is_favorite'), updated_at = now()
WHERE id = sqlc.arg('id') AND owner_user_id = sqlc.arg('owner_user_id');

# PeopleVault — Agent Guide

Project-specific operating notes for AI agents working in this repo.
Follow the `tdvorak-fullstack` skill (locked stack) at all times.

## Stack (locked — do not change without user approval)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TS strict + Tailwind + shadcn/ui |
| Backend | Go + Gin, `zap` logging |
| DB | PostgreSQL + sqlc + goose (versioned migrations only) |
| Cache | DragonflyDB (optional, Redis-compatible) — backend runs cache-free by default |
| Auth | Better Auth (cookie sessions); OAuth/Passkey-ready |
| API contract | OpenAPI 3.1 → generate TS client + types (never hand-duplicate) |
| Infra | Docker Compose + Nginx |

## Commands

- Full stack (no cache): `docker compose -f infra/docker-compose.yml up --build`
- Full stack (with DragonflyDB cache): `docker compose -f infra/docker-compose.yml -f infra/docker-compose.dragonfly.yml up --build`
- Backend: `cd apps/backend && go run ./cmd/server`
- Backend tests: `cd apps/backend && go test ./...`
- Frontend: `cd apps/frontend && pnpm install && pnpm dev`
- Frontend tests: `cd apps/frontend && pnpm test`
- Migrations: `cd apps/backend && goose -dir db/migrations postgres "$DATABASE_URL" up`
- Generate sqlc: `cd apps/backend && sqlc generate`
- Generate API client: `cd packages/api-client && pnpm gen`

## Conventions

- Go: small explicit packages, context propagation, structured `zap` logging, CGO-free.
- TS: strict mode, no `any`, feature-based folders.
- All schema changes via versioned goose migrations — never mutate schema manually.
- Never manually duplicate API types in frontend — generate from OpenAPI.
- No emojis in code or UI unless explicitly requested.
- No secrets committed. `.env` gitignored.
- Conventional Commits.

## Architecture notes

- Monorepo: strict frontend/backend separation, shared code explicit.
- Privacy-first: treat DB as highly sensitive. Never expose private notes via API unintentionally.
- Namedays are country-aware (CZ, SK, PL, HU, AT, DE) and extensible — data in `/data/namedays`.
- Reminders architected for future push/email/SMS delivery.
- Family-tree visualization is a future enhancement — data model already supports relationship links.
- DragonflyDB is optional. If `DRAGONFLY_ADDR` is empty, backend runs cache-free (rate limiting falls back to in-memory, nameday/holiday API caching disabled).

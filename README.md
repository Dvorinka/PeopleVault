# PeopleVault

A privacy-first **Personal Relationship Manager** — a private memory assistant that helps you remember, celebrate, and strengthen the relationships that matter most.

> This is **not** a sales CRM. It is a warm, premium, trustworthy place to keep track of family, friends, partner, relatives, colleagues, and acquaintainers — birthdays, anniversaries, namedays, events, reminders, notes, and memories — with your personal data under your control.

Privacy is a core feature, not a marketing bullet point.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript (strict) + Tailwind CSS + shadcn/ui |
| Backend | Go + Gin, structured `zap` logging |
| Database | PostgreSQL + sqlc + goose (versioned migrations) |
| Cache | DragonflyDB (optional, Redis-compatible) — backend runs cache-free by default |
| Auth | Better Auth (cookie sessions); OAuth/Passkey-ready architecture |
| API contract | OpenAPI 3.1 — single source of truth, TS client generated |
| Infra | Docker Compose (`docker compose up` runs the full stack) + Nginx |

## Quick start

```bash
cp .env.example .env          # adjust secrets for production
docker compose -f infra/docker-compose.yml up --build
```

- Frontend: http://localhost:5173 (dev) / http://localhost:8080 (via Nginx)
- Backend API: http://localhost:8081
- Postgres: localhost:5432

With optional DragonflyDB cache:
```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dragonfly.yml up --build
```

### Local development (without Docker)

**Backend**
```bash
cd apps/backend
cp .env.example .env
go run ./cmd/server
```

**Frontend**
```bash
cd apps/frontend
pnpm install
pnpm dev
```

## Repository layout

```
/apps
  /frontend          React + Vite + TS + Tailwind + shadcn/ui
  /backend           Go + Gin (cmd/server, internal/*)
/packages
  /api-client        Generated TS client + types (from OpenAPI)
  /shared-types      Shared TS types
/data
  /namedays          Country-aware nameday calendars (CSV)
/openapi             OpenAPI 3.1 spec (single source of truth)
/infra
  docker-compose.yml
  /nginx             Reverse proxy / TLS
/docs                Architecture & ADRs
```

## Features

- Dashboard: upcoming birthdays, anniversaries, namedays, today's events, countdowns, recently added, pending reminders, stats
- People: rich profiles (name, nickname, avatar, relationship, tags, birthday, anniversary, nameday, contact, notes, gift ideas, memories, interests, custom fields)
- Timeline: per-profile personal history
- Events: birthdays, anniversaries, namedays, weddings, graduations, holidays, custom; recurring + one-time
- Namedays: country-aware (CZ, SK, PL, HU, AT, DE) — extensible
- Birthday & anniversary logic: age, days until, leap-year handling, milestones
- Reminders: configurable lead times (same day → 1 month, custom)
- Search: fuzzy search across name, nickname, relationship, tags, notes, interests
- Tags: unlimited
- Notes: Markdown, autosave, private by default
- Attachments: photos, documents, voice notes (storage architected for future)
- Relationships: link people (parent/child/sibling/partner/friend/coworker/mentor)
- Onboarding: welcome, privacy, country, reminders, first contact, theme, tour
- Auth: email/password, session management, remember me, forgot password, email verification; OAuth + Passkey-ready
- Security: secure cookies, CSRF, CSP, rate limiting, validation, parameterized queries, RBAC-ready, audit logging
- UI: dark/light mode, responsive (desktop/tablet/mobile), WCAG AA, reduced-motion support, keyboard shortcuts, custom empty/loading states

## Security

All personal information is treated as highly sensitive. See [docs/SECURITY.md](docs/SECURITY.md).

- Parameterized queries everywhere (sqlc)
- CSRF protection + strict CSP
- Rate limiting on auth + write endpoints
- Secrets via environment variables only (never committed)
- Secure, HttpOnly, SameSite cookies
- Input validation at API boundary
- Audit logging for sensitive actions

## Testing

```bash
# Backend
cd apps/backend && go test ./...

# Frontend
cd apps/frontend && pnpm test
```

## Scorecard

| Dimension | Status |
|---|---|
| Performance | Lazy loading, code splitting, indexed queries, optional DragonflyDB cache |
| Security | CSRF, CSP, rate limiting, parameterized queries, secure sessions, audit log |
| Maintainability | Small explicit packages, OpenAPI contract, versioned migrations, strict TS |
| Developer Experience | `docker compose up`, typed end-to-end, clear docs, conventional commits |

## License

MIT — see [LICENSE](LICENSE).

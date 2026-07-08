# Plan: Nameday API + Holiday API Integration

## Status: PLANNED — execute after Proxmox backend + frontend PRs merge

---

## APIs

### 1. nameday.abalin.net (V2)

All endpoints verified working 2026-07-08.

| Endpoint | Method | Purpose | Verified |
|---|---|---|---|
| `/api/V2/today/{timezone}` | GET | Namedays for today, all countries | YES |
| `/api/V2/date?day={d}&month={m}` | GET | Namedays for specific date, all countries | YES |
| `/api/V2/date` | POST | Same as above, body `{day, month}` | YES |
| `/api/V2/getname` | POST | Search nameday by name across all countries | YES |

**Response shape (today):**
```json
{
  "success": true,
  "message": "Namedays for 07-08 timezone UTC",
  "data": {
    "cz": "Nora",
    "sk": "Ivan",
    "pl": "Adrian, Adrianna, Chwalimir, Edgar, Elzbieta, Eugeniusz",
    "hu": "Ellak",
    "at": "Amalia, Edgar, Kilian",
    "de": "Amalia, Edgar, Kilian"
  }
}
```

**Response shape (date):**
```json
{
  "success": true,
  "message": "Namedays for 01-01",
  "data": {
    "cz": "Novy rok",
    "sk": "Novy rok",
    "pl": "Mieczyslaw, Mieczyslawa, Mieszko",
    ...
  }
}
```

**Response shape (getname):**
```json
{
  "success": true,
  "data": [
    {
      "country": "cz",
      "0": {"day": 24, "month": 5, "name": "Jana"},
      "1": {"day": 24, "month": 6, "name": "Jan"},
      "2": {"day": 6, "month": 7, "name": "Upaleni mistra Jana Husa"}
    }
  ]
}
```

**Supported countries (19):** at, bg, cz, de, dk, ee, es, fi, fr, gr, hr, hu, it, lt, lv, pl, se, sk, us

**Notes:**
- Returns ALL countries in one call (no country filter on date/today endpoints)
- `data` is an object keyed by country code, value is comma-separated names string
- No auth, no rate limit headers observed
- Small hobby project (16 GitHub stars) — must cache aggressively + degrade gracefully

### 2. date.nager.at (Holiday API v4)

| Endpoint | Method | Purpose | Verified |
|---|---|---|---|
| `/api/v4/Holidays/{CountryCode}/{Year}` | GET | Public holidays for country+year | YES |
| `/api/v4/AvailableCountries` | GET | List supported country codes | (returns empty on test — may need different handling) |

**Response shape:**
```json
[
  {
    "date": "2026-01-01",
    "name": "New Year's Day",
    "countryCode": "AT",
    "nationalHoliday": true,
    "subdivisionCodes": null,
    "holidayTypes": ["Public"]
  }
]
```

**Features:** 150+ countries, no rate limits, CORS-enabled, open-source, reliable.

---

## Architecture

### Namedays: API-primary with CSV fallback

Replace the CSV-only nameday package with a provider interface:

```
internal/nameday/
  provider.go          — Provider interface
  abalin.go            — API client for nameday.abalin.net (primary)
  csv.go               — CSV loader (fallback/offline)
  service.go           — orchestrator: try API → fallback to CSV → cache in DragonflyDB
```

**Provider interface:**
```go
type Provider interface {
  GetByDate(ctx context.Context, month, day int) (map[string]string, error)  // country -> names
  GetToday(ctx context.Context) (map[string]string, error)
  SearchByName(ctx context.Context, name string) ([]CountryResult, error)
  SupportedCountries() []string
}
```

**Service logic:**
1. If DragonflyDB available: check cache (key: `nameday:date:{month}:{day}`, TTL 24h)
2. Cache hit → return
3. Cache miss (or no DragonflyDB) → call Abalin API
4. API success → cache result if DragonflyDB available, return
5. API failure → fall back to CSV data (if loaded)
6. No CSV → return error

**If DragonflyDB is not configured (DRAGONFLY_ADDR empty):** skip caching, call API directly on every request. The CSV fallback still works. Rate limiting falls back to in-memory.

**Why keep CSVs:**
- Offline fallback when API is down
- The API is a small hobby project — could disappear
- CSVs cover our 6 core countries; API gives us 19
- Person profiles store `nameday_month` + `nameday_day` — lookup is by date, which the API supports

**What changes:**
- Remove the manual CSV generation requirement for PL, HU, AT, DE (the backend task is generating these now — we keep CZ + SK, drop the rest since API covers them)
- Actually: keep all CSVs as fallback. The API has more countries than our CSVs. CSV = offline safety net for core 6, API = full 19-country coverage.
- The `/namedays/{country}` endpoint becomes: filter the API's all-countries response by the requested country code
- New endpoint: `GET /namedays/search?name=Jan` — proxy to abalin getname

### Holidays: API-only via date.nager.at

New package + endpoints. Holidays are inherently year-specific (moveable feasts, changing laws) so an API is the right choice — no static data.

```
internal/holiday/
  client.go            — HTTP client for date.nager.at
  service.go           — fetch + cache in DragonflyDB
  model.go             — Holiday struct
```

**Cache strategy:**
- If DragonflyDB available: key `holiday:{country}:{year}`, TTL 7 days
- Cache the full year's holiday list per country
- On cache miss (or no DragonflyDB): fetch from API, cache if available, return
- Without DragonflyDB: fetch from API on every request (holidays are read-only, low frequency)

**New API endpoints:**
- `GET /holidays/{country}/{year}` — list holidays for country+year
- `GET /holidays/{country}` — current year (convenience)

**Integration with events:**
- When a user selects country in settings, show public holidays as suggested events
- Dashboard "today's events" can include national holidays for the user's country
- Future: auto-create holiday events for the user's country

---

## OpenAPI changes

Add to `openapi/openapi.yaml`:

```yaml
/namedays/search:
  get:
    tags: [Namedays]
    parameters:
      - in: query
        name: name
        required: true
        schema: { type: string }
    responses:
      '200':
        description: OK
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  country: { type: string }
                  dates:
                    type: array
                    items:
                      type: object
                      properties:
                        day: { type: integer }
                        month: { type: integer }
                        name: { type: string }

/holidays/{country}/{year}:
  get:
    tags: [Holidays]
    security: []
    parameters:
      - in: path
        name: country
        required: true
        schema: { type: string }
      - in: path
        name: year
        required: true
        schema: { type: integer }
    responses:
      '200':
        description: OK
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  date: { type: string, format: date }
                  name: { type: string }
                  countryCode: { type: string }
                  nationalHoliday: { type: boolean }
                  holidayTypes:
                    type: array
                    items: { type: string }

/holidays/{country}:
  get:
    tags: [Holidays]
    security: []
    parameters:
      - in: path
        name: country
        required: true
        schema: { type: string }
    responses:
      '200':
        description: OK (current year)
```

Update existing `/namedays/{country}` to note it now proxies to the abalin API with CSV fallback.

---

## DB changes

No schema changes needed. Holidays are fetched on-demand and cached in DragonflyDB.

Optional future migration: add `holidays_synced` boolean to `user_settings` if we auto-create holiday events.

---

## Frontend changes

1. **Settings page**: Country selector now shows all 19 supported countries (from API), not just 6
2. **Dashboard**: "Today's namedays" uses the API response (already does via backend)
3. **Person profile**: Nameday display works the same (backend handles API vs CSV)
4. **New: Holiday picker** — when adding events, user can browse/import public holidays for their country
5. **Nameday search**: New UI in person edit — search by name to find the nameday date

---

## Implementation order (single Proxmox dispatch after PRs merge)

1. Create `internal/nameday/provider.go` interface
2. Create `internal/nameday/abalin.go` — HTTP client with all 4 endpoints
3. Refactor `internal/nameday/csv.go` — keep as fallback provider
4. Create `internal/nameday/service.go` — cache + fallback orchestration
5. Create `internal/holiday/client.go` + `service.go` — date.nager.at integration
6. Add optional DragonflyDB caching for both (TTL: namedays 24h, holidays 7d). If DRAGONFLY_ADDR is empty, skip caching — backend works cache-free.
7. Update handlers: `/namedays/{country}`, add `/namedays/search`, add `/holidays/{country}/{year}`
8. Update OpenAPI spec
9. Regenerate API client types
10. Update frontend: country selector (19 countries), holiday browser, nameday search
11. Tests: mock API responses, test fallback logic, test cache hit/miss
12. Build verification: `go build`, `go vet`, `go test`, `tsc --noEmit`, `pnpm build`

---

## Risk mitigation

| Risk | Mitigation |
|---|---|
| Abalin API goes down | CSV fallback for core 6 countries |
| Abalin API disappears | CSV data still works; switch to another provider |
| Abalin rate limits | DragonflyDB cache (24h TTL) if available — at most 366 calls/year per deployment. Without cache, calls are per-request but low-frequency. |
| Nager.Date goes down | DragonflyDB cache (7d TTL) if available — stale holidays better than no holidays. Without cache, holidays simply unavailable until API recovers. |
| API response format changes | Parse defensively, log errors, fall back gracefully |
| Privacy (external API calls) | Backend proxies all calls; frontend never calls external APIs directly |

---

## What NOT to change

- DB schema (no migration needed)
- Auth system
- Existing API routes (only adding new ones)
- CSV files (keep as fallback — don't delete)
- Core architecture

This is a purely additive change: new providers, new endpoints, new cache keys.

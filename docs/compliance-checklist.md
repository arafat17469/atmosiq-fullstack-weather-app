# AtmosIQ compliance checklist

Requirement-by-requirement audit against both PM Accelerator technical
assessments, written 2026-10-20. Each item carries exactly one status:

- **Implemented and tested** — the feature exists and automated tests cover it.
- **Implemented, not fully tested** — the feature exists but lacks automated coverage
  (verified by code review and manual inspection only).
- **Not implemented** — the feature does not exist.

Where tests exist, they are the Vitest unit suite (52 passing). DB integration tests
were written but **not run**: this environment has no PostgreSQL and no Docker, so
they skip automatically and will run wherever a live `DATABASE_URL` is available.

## Tech Assessment #1 — Frontend

| Requirement | Status | Notes |
|---|---|---|
| Location search: city, postal code, landmark | Implemented, not fully tested | Text search goes through the Open-Meteo geocoding API (`/api/locations/search`); cities, postal codes, and landmarks resolve as text queries. Search route and SearchBar are not covered by automated tests. |
| Location search: raw coordinates | Implemented, not fully tested | The requests API accepts `{ latitude, longitude }` directly. The dashboard search box is text-only; coords are supported on the requests endpoints, not in the dashboard search UI. |
| Location search: autocomplete + disambiguation | Implemented, not fully tested | SearchBar shows suggestions with name, region, and country. Not covered by automated tests. |
| Current weather dashboard fields (temp, feels-like, humidity, wind speed/direction, precipitation, pressure, cloud cover, visibility, UV, sunrise/sunset, C/F toggle) | Implemented, not fully tested | All fields render from live Open-Meteo data. No UI tests. |
| 5-day forecast | Implemented, not fully tested | Daily cards render 7 days by default, up to 16 via the API. No UI tests. |
| Hourly forecast | Implemented, not fully tested | 24-hour temperature/precipitation chart, up to 168 hours via the API. No UI tests. |
| Geolocation + denial handling | Implemented, not fully tested | "Use my location" with messages for unsupported browsers, permission denied, and timeout. Not covered by automated tests. |
| Error handling (validation failures, unknown location, provider outage, not found) | Implemented, not fully tested | User-safe messages, `{ error: { message, code } }` envelope, no stack traces to the client. Route-level error mapping is verified by code review only. |
| Map integration (Leaflet + OpenStreetMap) | Implemented, not fully tested | MapView renders the selected location. No UI tests. |

## Tech Assessment #2 — Backend

| Requirement | Status | Notes |
|---|---|---|
| CRUD: create saved weather request | Implemented, not fully tested | POST stores the request plus provider-fetched observations in Postgres. Integration test written but **not run** (no DB in this environment). |
| CRUD: read (single + paginated list with filters) | Implemented, not fully tested | GET endpoints with search/filter/sort/pagination. Integration tests written but not run. |
| CRUD: update (label, notes, dates, favorite) | Implemented, not fully tested | PATCH with date changes re-fetching observations. Integration tests written but not run. |
| CRUD: delete | Implemented, not fully tested | DELETE cascades to observations. Integration test written but not run. |
| Input validation (Zod schemas, date ranges, coordinate bounds) | Implemented and tested | 18 unit tests cover coordSchema, dateStringSchema (incl. rejecting 2026-02-30), validateDateRange (start>end, beyond today+16d, before today-92d, valid range), createRequestSchema label length. |
| Export CSV | Implemented, not fully tested | CSV with metric column headers, quoted cells, attachment filename. Integration test written but not run. |
| Export JSON | Implemented, not fully tested | JSON payload with source metadata. Integration test written but not run. |
| Rate limiting | Implemented, not fully tested | In-memory per-IP limiter (60/min default) wired into every API route; limiter logic has 4 unit tests, but per-route wiring is verified by code review only. |

## Cross-cutting (both assessments)

| Requirement | Status | Notes |
|---|---|---|
| Travel insights | Implemented, not fully tested | Rule-based notes on the travel page; the rules engine (`lib/recommendations.ts`) has 9 unit tests, but the page itself is not test-covered. |
| Comparison page | Implemented, not fully tested | Side-by-side comparison of two locations. No UI tests. |
| Recommendations labeled as rule-based, not AI/ML | Implemented, not fully tested | The travel page carries the disclaimer "Rule-based guidance, not an AI prediction" and `lib/recommendations.ts` documents the same; the rule engine is unit-tested, but the visible disclaimer is verified by code review only. |
| README + env documentation | Implemented and tested | README covers setup, exact commands, env vars, API docs, data model, deployment, limitations. Commands (`npm test`, `tsc --noEmit`) were verified by running them. |
| Unit test suite | Implemented and tested | 52 tests pass: validation, units, recommendations, Open-Meteo module surface, API input shapes, rate limiter. |
| DB integration tests | Implemented, not fully tested | 12 tests written for POST/GET/PATCH/DELETE/export with a stubbed provider fetch. **They were not run here** — no PostgreSQL available — and skip automatically without a live `DATABASE_URL`. |
| Deployment | Not implemented | Not deployed. The Vercel deployment plan (including `prisma migrate deploy`) is documented in the README, but no production deployment exists yet. |

## Summary of gaps

1. **No UI/E2E tests.** All page components were verified by code review, not automated tests.
2. **DB integration tests exist but are unverified** until they run against a live PostgreSQL.
3. **Not deployed** — Vercel deployment is still pending.
4. Dashboard search is text-only; raw coordinates are supported on the requests API but not in the dashboard search box.
5. No authentication layer: the requests API is open to anyone with the URL (documented in the README as a known limitation).

# AtmosIQ

A full-stack weather application: location search, current conditions, 5-day forecasts,
hourly trends, an interactive map, side-by-side place comparison, trip insights, and saved
weather requests (create, read, update, delete) with CSV/JSON export.

All weather and geocoding data comes live from the free
[Open-Meteo](https://open-meteo.com/) APIs. No weather data is static or hard-coded.

## Applicant

**Arafat Rahman** (PM Accelerator AI Engineer Intern, technical assessment)

- Portfolio: https://arafat174.vercel.app
- GitHub: https://github.com/arafat17469
- Kaggle: https://kaggle.com/arafat1746

## Assessment scope

This project covers both parts of the PM Accelerator technical assessment:

- **Tech Assessment #1 (Frontend):** location search, current weather dashboard, 5-day
  forecast, hourly forecast, geolocation, error handling, map integration.
- **Tech Assessment #2 (Backend):** CRUD weather-request API, input validation,
  CSV/JSON export, rate limiting, PostgreSQL persistence, API documentation.

## Key features

- **Location search:** city, postal code, landmark, or raw latitude/longitude, powered by
  the Open-Meteo geocoding API with autocomplete suggestions and disambiguation
  (name, region, country shown for each result).
- **Current weather dashboard:** temperature, feels-like, humidity, wind speed and
  direction, precipitation, pressure, cloud cover, visibility, UV index, sunrise/sunset,
  with Celsius/Fahrenheit toggle.
- **5-day forecast:** daily cards with high/low temperature, precipitation probability,
  and weather-code labels.
- **Hourly forecast:** 24-hour temperature trend chart with precipitation probability,
  humidity, and UV.
- **Interactive map:** Leaflet/OpenStreetMap map showing the selected location.
- **Compare:** side-by-side weather for two locations.
- **Travel insights:** rule-based trip notes derived from recorded weather data. These
  are fixed thresholds, not AI predictions, and the page labels them as such.
- **Saved weather requests (CRUD):** save a location plus date range as a request,
  list requests with search/filter/sort/pagination, update labels, notes, dates, or
  favorite flag, and delete. Observations are fetched from Open-Meteo at creation time
  and stored in PostgreSQL.
- **Export:** any saved request exports as CSV or JSON via the API.
- **Geolocation:** "Use my location" on the dashboard, with clear messages when the
  browser does not support it, permission is denied, or lookup times out.
- **Error handling:** user-safe error messages for validation failures, unknown
  locations, provider outages, and rate limits. Stack traces and provider internals are
  never sent to the client.
- **Rate limiting:** in-memory per-IP limiter (60 requests/minute per IP by default).

## Tech stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript (strict)
- **Styling:** Tailwind CSS
- **Data:** Prisma ORM, PostgreSQL
- **Validation:** Zod
- **Map:** Leaflet + React-Leaflet (OpenStreetMap tiles)
- **Charts:** Recharts
- **Tests:** Vitest

## Architecture overview

```
app/
  page.tsx                    # dashboard (search, current, forecast, hourly, map)
  compare/page.tsx            # two-location comparison
  travel/page.tsx             # rule-based travel insights
  requests/page.tsx           # saved requests CRUD UI
  about/page.tsx              # project and applicant info
  api/
    health/route.ts                      # liveness check
    locations/search/route.ts            # geocoding proxy
    weather/current/route.ts             # current conditions
    weather/forecast/route.ts            # daily forecast
    weather/hourly/route.ts              # hourly forecast
    weather/requests/route.ts            # list + create saved requests
    weather/requests/[id]/route.ts       # read / update / delete one request
    weather/requests/[id]/export/route.ts # CSV / JSON export
components/                   # SearchBar, CurrentWeather, ForecastCards,
                              # HourlyChart, MapView, UnitToggle, ErrorBox,
                              # RequestForm, RequestList, RequestDetail
lib/
  openmeteo.ts                # Open-Meteo client + response parsing
  validation.ts               # Zod schemas + date-range rules
  recommendations.ts          # rule-based travel/weather recommendations
  units.ts                    # unit conversion, compass labels, WMO codes
  rate-limit.ts               # in-memory per-IP rate limiter
  api.ts                      # response envelopes + error mapping
  prisma.ts                   # Prisma client singleton
prisma/
  schema.prisma               # Location, WeatherRequest, WeatherObservation
  migrations/20261020000000_init/migration.sql  # hand-written, prisma-validated
tests/                        # Vitest unit tests + DB integration tests
```

API routes use a shared envelope: success is `{ data: ... }`, errors are
`{ error: { message, code } }` with an appropriate HTTP status.

## Prerequisites

- Node.js 18.17 or newer
- A PostgreSQL database (local or hosted, e.g. Neon/Supabase/Railway)

## Environment variables

Copy `.env.example` to `.env` and set the values:

```bash
cp .env.example .env
```

| Variable      | Required | Description                                             |
|---------------|----------|---------------------------------------------------------|
| `DATABASE_URL` | Yes     | PostgreSQL connection string used by Prisma.            |

## Install and run

```bash
npm install
```

### Database setup

```bash
# Apply migrations to the database named in DATABASE_URL
npx prisma migrate dev

# (Optional) inspect the data
npx prisma studio
```

The initial migration (`prisma/migrations/20261020000000_init/migration.sql`) creates the
`Location`, `WeatherRequest`, and `WeatherObservation` tables. The schema was checked with
`prisma validate`, and the Prisma client is generated with `npx prisma generate`.

### Development

```bash
npm run dev        # start the dev server at http://localhost:3000
```

### Test

```bash
npm test           # run the Vitest suite once
npm run test:watch # watch mode
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm run build      # production build
```

**Honest note on tests:** `tests/requests-api.test.ts` contains DB integration tests for
POST/GET/PATCH/DELETE and export. They need a live PostgreSQL behind `DATABASE_URL`.
This VM had no Postgres and no Docker, so those 12 tests skip here (and document that
they were not run). Set a live `DATABASE_URL` to run them; use `SKIP_DB=1` to force a
skip. All 52 unit tests run and pass with no database.

## API documentation

Base URL: `http://localhost:3000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Liveness check. Returns `{ data: { status: "ok", time } }`. |
| GET | `/api/locations/search?q=<text>&count=<n>` | Geocoding. `q` needs 2-100 characters; `count` clamps to 1-20. |
| GET | `/api/weather/current?latitude=&longitude=&units=c\|f` | Current conditions for coordinates. |
| GET | `/api/weather/forecast?latitude=&longitude=&days=<1-16>&units=c\|f` | Daily forecast (default 7 days). |
| GET | `/api/weather/hourly?latitude=&longitude=&hours=<1-168>&units=c\|f` | Hourly forecast (default 24 hours). |
| GET | `/api/weather/requests?location=&from=&to=&favorite=&sort=asc\|desc&page=&limit=` | List saved requests, paginated (defaults: page 1, limit 20). |
| POST | `/api/weather/requests` | Create a saved request. Body: `{ location: {query} \| {latitude, longitude}, startDate, endDate, label?, notes? }`. Fetches observations from Open-Meteo and stores them. Returns 201. |
| GET | `/api/weather/requests/:id` | One request with location and observations. |
| PATCH | `/api/weather/requests/:id` | Update `label`, `notes`, `startDate`/`endDate`, or `isFavorite`. Changing dates re-fetches observations. |
| DELETE | `/api/weather/requests/:id` | Delete a request (observations cascade). |
| GET | `/api/weather/requests/:id/export?format=csv\|json` | Download the request as CSV or JSON. |

Date ranges are limited to the past 92 days through the next 16 days (the Open-Meteo
archive/forecast window). Common error codes: `validation_error` (400), `not_found`
(404), `weather_provider_error` (502), `rate_limited` (429), `internal_error` (500).

### Example: create a request

```bash
curl -X POST http://localhost:3000/api/weather/requests \
  -H 'Content-Type: application/json' \
  -d '{
    "location": { "query": "Bogura" },
    "startDate": "2026-10-13",
    "endDate": "2026-10-20",
    "label": "Bogura trip"
  }'
```

### Example: export CSV

```bash
curl -o request-1.csv "http://localhost:3000/api/weather/requests/1/export?format=csv"
```

## Data model

- **Location** — a named place with coordinates, region, country, timezone. Reused across
  requests via a unique `(latitude, longitude)` pair.
- **WeatherRequest** — a saved request: location, start/end date, label, notes, favorite
  flag, status, timestamps. Observations are snapshots of provider data, stored in
  metric units so exports stay consistent.
- **WeatherObservation** — one day of observed data per request: min/max/mean
  temperature, precipitation, humidity, wind speed, weather code, source, and the date
  it was retrieved. Deleting a request deletes its observations.

## Third-party APIs

- **Open-Meteo forecast API** (`api.open-meteo.com`): current conditions, daily
  forecast, hourly forecast, and date-range data. Free, no API key.
- **Open-Meteo geocoding API** (`geocoding-api.open-meteo.com`): location search and
  disambiguation. Free, no API key.
- **OpenStreetMap tiles**: map rendering through Leaflet.

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Add the `DATABASE_URL` environment variable (use a hosted Postgres, e.g. Neon or
   Supabase).
4. Deploy. Run `npx prisma migrate deploy` against the production database once
   (from your machine or a CI step) before first use.

The app has not been deployed yet; deployment is pending the assessment submission.

## Known limitations

- DB integration tests were written but not run here: this environment has no
  PostgreSQL and no Docker. They skip automatically and will run wherever a live
  `DATABASE_URL` is available.
- Geocoding quality depends on Open-Meteo's dataset; obscure localities may resolve
  poorly, and the API has its own fair-use limits.
- Rate limiting is in-memory per process, so it resets on redeploy and does not share
  state across instances.
- Date ranges are bounded by the Open-Meteo window (past 92 days to next 16 days);
  requests outside it are rejected with a clear message.
- No authentication layer yet; the requests API is open to anyone with the URL.

## Future improvements

- User accounts and auth so saved requests are private per user.
- Favorites and request tagging beyond the single favorite flag.
- Cached forecast responses to cut provider calls.
- E2E tests with Playwright and a real test database in CI.
- Alerts (email/webhook) when saved date ranges show severe weather.
- Multi-language UI.

## License

Built as a technical assessment submission by Arafat Rahman.

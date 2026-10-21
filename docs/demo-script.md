# AtmosIQ demo script (about 110 seconds)

Record the app running locally (`npm run dev`, http://localhost:3000). Keep the
narration short and natural; one sentence per screen.

## 0:00 - 0:10 — Location search and current weather

**On screen:** Dashboard. Type "Bogura" in the search box, pick the suggestion,
watch the dashboard load.

**Say:** "AtmosIQ is a full-stack weather app. I search for a city, pick the right
match from the suggestions, and the dashboard shows current conditions: temperature,
feels-like, humidity, wind, UV, sunrise and sunset."

## 0:10 - 0:30 — Forecast and hourly chart

**On screen:** Scroll to the 5-day forecast cards, then the 24-hour temperature chart.

**Say:** "Below that, a five-day forecast with precipitation chances, and an hourly
chart for the next 24 hours. Everything is live data from the Open-Meteo API,
and I can toggle Celsius and Fahrenheit up top."

## 0:30 - 0:45 — Map and comparison

**On screen:** Pan/zoom the map on the dashboard, then open the Compare page and
compare Bogura with Dhaka.

**Say:** "There is an interactive map for the location, and a compare page that puts
two cities side by side."

## 0:45 - 1:05 — Saved requests (CRUD) and export

**On screen:** Open the Requests page. Create a request for a city and a date range,
rename it, mark it favorite, then download the CSV and show it in a spreadsheet.

**Say:** "I can also save a weather request: a location plus a date range. The app
fetches the data and stores it in Postgres. I can rename it, favorite it, delete it,
and export it as CSV or JSON."

## 1:05 - 1:20 — Travel insights

**On screen:** Open the Travel page for a location.

**Say:** "Finally, the travel page gives rule-based guidance from the weather data,
like carrying an umbrella when rain is likely. It is simple fixed thresholds, not
an AI prediction, and the page says so."

## Notes for the recording

## 1:20 - 1:50 — Code, validation, and assessment scope

**On screen:** Show `prisma/schema.prisma` (the three related tables),
`app/api/weather/requests/route.ts` (validated input and transactional storage),
and `app/api/weather/requests/[id]/export/route.ts` (CSV/JSON output).
Return to the app, briefly demonstrate an invalid date range, and show About.

**Say:** "The backend uses Zod to validate inputs and Prisma with PostgreSQL to
persist locations, requests, and observations. These routes implement CRUD and
CSV/JSON export. Invalid ranges produce a clear error. I am Arafat Rahman, and
this submission covers both the frontend and backend assessments."

Only describe persistence as verified after testing against a real database.
Record the actual app and code; this script is not a substitute for the required video.

- Use a clean browser profile; the app needs no login.
- If geolocation is shown, expect the permission prompt; the app handles denial
  gracefully, so that is fine to leave in or cut.
- Keep the cursor movement slow enough to read the screen.

// Open-Meteo integration: free weather and geocoding APIs, no API key needed.

import { validateDateRange } from "./validation";
import { weatherCodeInfo } from "./units";

export interface LocationResult {
  name: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export type TempUnit = "celsius" | "fahrenheit";

export interface CurrentWeather {
  time: string;
  temperature: number | null;
  feelsLike: number | null;
  weatherCode: number | null;
  weatherLabel: string;
  humidity: number | null;
  windSpeed: number | null; // km/h
  windDirectionDeg: number | null;
  windDirectionLabel: string;
  precipitation: number | null; // mm
  pressure: number | null; // hPa
  cloudCover: number | null; // %
  visibility: number | null; // meters
  uvIndex: number | null;
  sunrise: string | null;
  sunset: string | null;
  isDay: boolean;
  timezone: string;
  units: TempUnit;
}

export interface DailyWeather {
  date: string; // YYYY-MM-DD
  weatherCode: number | null;
  tempMin: number | null;
  tempMax: number | null;
  precipProbMax: number | null; // %
  precipitationSum: number | null; // mm
  windSpeedMax: number | null; // km/h
  uvIndexMax: number | null;
  humidityMean: number | null; // %
}

export interface HourlyWeather {
  time: string; // local ISO, e.g. 2026-10-20T21:00
  temperature: number | null;
  precipitationProbability: number | null; // %
  humidity: number | null; // %
  weatherCode: number | null;
  windSpeed: number | null; // km/h
  uvIndex: number | null;
}

// Thrown for every Open-Meteo failure. The message is safe to show to users;
// raw provider internals are never exposed.
export class OpenMeteoError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OpenMeteoError";
    this.status = status;
  }
}

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FETCH_TIMEOUT_MS = 10_000;

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new OpenMeteoError(
        `The weather service returned an error (status ${res.status}). Please try again.`,
        res.status,
      );
    }
    return (await res.json()) as unknown;
  } catch (err) {
    if (err instanceof OpenMeteoError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new OpenMeteoError("The weather service timed out. Please try again.");
    }
    throw new OpenMeteoError("Could not reach the weather service. Please try again.");
  } finally {
    clearTimeout(timer);
  }
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumberArray(value: unknown): Array<number | null> {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asNumber(v));
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function valueAt(values: Array<number | null>, index: number): number | null {
  return index >= 0 && index < values.length ? values[index] : null;
}

// Find the hourly slot that matches the current hour (e.g. "2026-10-20T21:30"
// matches the "2026-10-20T21:00" slot).
function hourlyIndexFor(time: string | undefined, hourlyTimes: unknown): number {
  if (!time || !Array.isArray(hourlyTimes)) return -1;
  const hourKey = time.slice(0, 13);
  return hourlyTimes.findIndex((t) => typeof t === "string" && t.slice(0, 13) === hourKey);
}

export async function searchLocations(query: string, count = 5): Promise<LocationResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: String(Math.min(Math.max(Math.floor(count), 1), 20)),
    language: "en",
    format: "json",
  });
  const data = asRecord(await fetchJson(`${GEOCODE_URL}?${params.toString()}`));
  const results = data.results;
  if (!Array.isArray(results)) return [];

  return results.map((item): LocationResult => {
    const rec = asRecord(item);
    const location: LocationResult = {
      name: asString(rec.name) ?? query,
      latitude: asNumber(rec.latitude) ?? 0,
      longitude: asNumber(rec.longitude) ?? 0,
    };
    const region = asString(rec.admin1);
    const country = asString(rec.country);
    const countryCode = asString(rec.country_code);
    const timezone = asString(rec.timezone);
    if (region) location.region = region;
    if (country) location.country = country;
    if (countryCode) location.countryCode = countryCode;
    if (timezone) location.timezone = timezone;
    return location;
  });
}

export async function getCurrentWeather(
  lat: number,
  lon: number,
  unit: TempUnit = "celsius",
): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m",
    hourly: "visibility,uv_index",
    daily: "sunrise,sunset",
    timezone: "auto",
    temperature_unit: unit,
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    forecast_days: "1",
  });
  const data = asRecord(await fetchJson(`${FORECAST_URL}?${params.toString()}`));
  const current = asRecord(data.current);
  const hourly = asRecord(data.hourly);
  const daily = asRecord(data.daily);

  const time = asString(current.time) ?? "";
  const hourIndex = hourlyIndexFor(time, hourly.time);
  const weatherCode = asNumber(current.weather_code);
  const windDirectionDeg = asNumber(current.wind_direction_10m);

  return {
    time,
    temperature: asNumber(current.temperature_2m),
    feelsLike: asNumber(current.apparent_temperature),
    weatherCode,
    weatherLabel: weatherCodeInfo(weatherCode).label,
    humidity: asNumber(current.relative_humidity_2m),
    windSpeed: asNumber(current.wind_speed_10m),
    windDirectionDeg,
    windDirectionLabel: windDirectionDeg == null ? "Unknown" : windDirectionLabel(windDirectionDeg),
    precipitation: asNumber(current.precipitation),
    pressure: asNumber(current.pressure_msl),
    cloudCover: asNumber(current.cloud_cover),
    visibility: valueAt(asNumberArray(hourly.visibility), hourIndex),
    uvIndex: valueAt(asNumberArray(hourly.uv_index), hourIndex),
    sunrise: Array.isArray(daily.sunrise) && typeof daily.sunrise[0] === "string" ? daily.sunrise[0] : null,
    sunset: Array.isArray(daily.sunset) && typeof daily.sunset[0] === "string" ? daily.sunset[0] : null,
    isDay: asNumber(current.is_day) === 1,
    timezone: asString(data.timezone) ?? "UTC",
    units: unit,
  };
}

function windDirectionLabel(deg: number): string {
  const points = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const normalized = ((deg % 360) + 360) % 360;
  return points[Math.round(normalized / 22.5) % 16];
}

function parseDaily(data: Record<string, unknown>): DailyWeather[] {
  const daily = asRecord(data.daily);
  const dates = Array.isArray(daily.time) ? daily.time : [];
  const weatherCode = asNumberArray(daily.weather_code);
  const tempMin = asNumberArray(daily.temperature_2m_min);
  const tempMax = asNumberArray(daily.temperature_2m_max);
  const precipProb = asNumberArray(daily.precipitation_probability_max);
  const precipSum = asNumberArray(daily.precipitation_sum);
  const windMax = asNumberArray(daily.wind_speed_10m_max);
  const uvMax = asNumberArray(daily.uv_index_max);
  const humidityMean = asNumberArray(daily.relative_humidity_2m_mean);

  const out: DailyWeather[] = [];
  for (let i = 0; i < dates.length; i += 1) {
    const date = dates[i];
    if (typeof date !== "string") continue;
    out.push({
      date,
      weatherCode: valueAt(weatherCode, i),
      tempMin: valueAt(tempMin, i),
      tempMax: valueAt(tempMax, i),
      precipProbMax: valueAt(precipProb, i),
      precipitationSum: valueAt(precipSum, i),
      windSpeedMax: valueAt(windMax, i),
      uvIndexMax: valueAt(uvMax, i),
      humidityMean: valueAt(humidityMean, i),
    });
  }
  return out;
}

const DAILY_FIELDS =
  "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max,relative_humidity_2m_mean";

export async function getForecast(
  lat: number,
  lon: number,
  days: number,
  unit: TempUnit = "celsius",
): Promise<DailyWeather[]> {
  const clampedDays = Math.min(Math.max(Math.floor(days), 1), 16);
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: DAILY_FIELDS,
    timezone: "auto",
    temperature_unit: unit,
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    forecast_days: String(clampedDays),
  });
  const data = asRecord(await fetchJson(`${FORECAST_URL}?${params.toString()}`));
  return parseDaily(data).slice(0, clampedDays);
}

export async function getHourly(
  lat: number,
  lon: number,
  hours: number,
  unit: TempUnit = "celsius",
): Promise<HourlyWeather[]> {
  const clampedHours = Math.min(Math.max(Math.floor(hours), 1), 168);
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly:
      "temperature_2m,precipitation_probability,relative_humidity_2m,weather_code,wind_speed_10m,uv_index",
    timezone: "auto",
    temperature_unit: unit,
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    forecast_days: "7",
  });
  const data = asRecord(await fetchJson(`${FORECAST_URL}?${params.toString()}`));
  const hourly = asRecord(data.hourly);
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const temperature = asNumberArray(hourly.temperature_2m);
  const precipProb = asNumberArray(hourly.precipitation_probability);
  const humidity = asNumberArray(hourly.relative_humidity_2m);
  const weatherCode = asNumberArray(hourly.weather_code);
  const windSpeed = asNumberArray(hourly.wind_speed_10m);
  const uvIndex = asNumberArray(hourly.uv_index);

  const out: HourlyWeather[] = [];
  for (let i = 0; i < times.length && out.length < clampedHours; i += 1) {
    const time = times[i];
    if (typeof time !== "string") continue;
    out.push({
      time,
      temperature: valueAt(temperature, i),
      precipitationProbability: valueAt(precipProb, i),
      humidity: valueAt(humidity, i),
      weatherCode: valueAt(weatherCode, i),
      windSpeed: valueAt(windSpeed, i),
      uvIndex: valueAt(uvIndex, i),
    });
  }
  return out;
}

function diffDays(from: string, to: string): number {
  const a = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Fetches daily weather covering [startDate, endDate]. Open-Meteo serves at most
// 92 past days and 16 forecast days, so the range must already sit inside that
// window (validated here and again by the route-level Zod schemas).
export async function getDateRangeWeather(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
  unit: TempUnit = "celsius",
): Promise<DailyWeather[]> {
  const check = validateDateRange(startDate, endDate);
  if (!check.ok) {
    throw new OpenMeteoError(check.message);
  }
  const today = todayUtc();
  const pastDays = Math.min(Math.max(diffDays(startDate, today), 0), 92);
  const forecastDays = Math.min(Math.max(diffDays(today, endDate), 1), 16);

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: DAILY_FIELDS,
    timezone: "auto",
    temperature_unit: unit,
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    past_days: String(pastDays),
    forecast_days: String(forecastDays),
  });
  const data = asRecord(await fetchJson(`${FORECAST_URL}?${params.toString()}`));
  return parseDaily(data).filter((d) => d.date >= startDate && d.date <= endDate);
}

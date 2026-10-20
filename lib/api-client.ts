// Typed fetch wrappers for the AtmosIQ backend API.
// Every endpoint follows the { data: ... } envelope; errors follow { error: { message, code? } }.

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type Units = "c" | "f";

export interface LocationResult {
  name: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CurrentWeatherData {
  time: string;
  temperature: number | null;
  feelsLike: number | null;
  weatherCode: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirectionDeg: number | null;
  windDirectionLabel: string | null;
  precipitation: number | null;
  pressure: number | null;
  cloudCover: number | null;
  visibility: number | null;
  uvIndex: number | null;
  sunrise: string | null;
  sunset: string | null;
  isDay: boolean;
  timezone: string | null;
  units: Units;
}

export interface ForecastDay {
  date: string;
  weatherCode: number | null;
  weatherLabel: string | null;
  tempMin: number | null;
  tempMax: number | null;
  precipProbMax: number | null;
  precipitationSum: number | null;
  windSpeedMax: number | null;
  uvIndexMax: number | null;
}

export interface HourlyPoint {
  time: string;
  temperature: number | null;
  precipProb: number | null;
  humidity: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
}

export interface RequestLocation {
  name: string;
  country: string | null;
  latitude: number;
  longitude: number;
}

export interface WeatherRequest {
  id: number;
  label: string | null;
  notes: string | null;
  isFavorite: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  location: RequestLocation;
  _count?: { observations: number };
}

export interface Observation {
  observationDate: string;
  temperatureMin: number | null;
  temperatureMax: number | null;
  temperatureMean: number | null;
  precipitation: number | null;
  humidity: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  source: string;
}

export interface CreateRequestBody {
  location: { latitude: number; longitude: number } | { query: string };
  startDate: string;
  endDate: string;
  label?: string;
  notes?: string;
}

export interface ListRequestsParams {
  location?: string;
  from?: string;
  to?: string;
  favorite?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface RequestsPageResult {
  items: WeatherRequest[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError("Network error — check your connection and retry.");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body; fall through to status handling below.
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: { message?: string } }).error?.message ||
          `Request failed with status ${res.status}`
        : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  throw new ApiError("Unexpected response format from server.", res.status);
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function searchLocations(
  q: string,
  count = 8
): Promise<LocationResult[]> {
  return apiFetch<LocationResult[]>(
    `/api/locations/search${qs({ q, count })}`
  );
}

export async function getCurrentWeather(
  lat: number,
  lon: number,
  units: Units
): Promise<CurrentWeatherData> {
  return apiFetch<CurrentWeatherData>(
    `/api/weather/current${qs({ lat, lon, units })}`
  );
}

export async function getForecast(
  lat: number,
  lon: number,
  days: number,
  units: Units
): Promise<{ daily: ForecastDay[]; units: Units }> {
  return apiFetch(`/api/weather/forecast${qs({ lat, lon, days, units })}`);
}

export async function getHourly(
  lat: number,
  lon: number,
  hours: number,
  units: Units
): Promise<{ hourly: HourlyPoint[]; units: Units }> {
  return apiFetch(`/api/weather/hourly${qs({ lat, lon, hours, units })}`);
}

export async function createRequest(
  body: CreateRequestBody
): Promise<{ request: WeatherRequest; observations: Observation[] }> {
  return apiFetch("/api/weather/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listRequests(
  params: ListRequestsParams = {}
): Promise<RequestsPageResult> {
  return apiFetch<RequestsPageResult>(
    `/api/weather/requests${qs({ ...params, favorite: params.favorite ? "true" : undefined })}`
  );
}

export async function getRequest(
  id: number
): Promise<{ request: WeatherRequest; observations: Observation[] }> {
  const data = await apiFetch<unknown>(
    `/api/weather/requests/${encodeURIComponent(id)}`
  );
  // The backend nests observations inside the request object; the written
  // contract described a { request, observations } pair. Accept both.
  if (data && typeof data === "object") {
    if ("observations" in data && Array.isArray((data as { observations: unknown }).observations)) {
      const { observations, ...request } = data as WeatherRequest & {
        observations: Observation[];
      };
      return { request, observations };
    }
    if ("request" in data) {
      return data as { request: WeatherRequest; observations: Observation[] };
    }
  }
  throw new ApiError("Unexpected response format from server.");
}

export async function updateRequest(
  id: number,
  body: Partial<Pick<WeatherRequest, "label" | "notes" | "startDate" | "endDate" | "isFavorite">>
): Promise<WeatherRequest> {
  return apiFetch(`/api/weather/requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteRequest(id: number): Promise<{ deleted: boolean }> {
  return apiFetch(`/api/weather/requests/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** Trim an ISO date-time string down to YYYY-MM-DD for display and date inputs. */
export function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

import { Prisma } from "@prisma/client";
import { jsonOk, jsonError, getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  createRequestSchema,
  listQuerySchema,
  type CreateRequestInput,
} from "@/lib/validation";
import { searchLocations, getDateRangeWeather, type DailyWeather } from "@/lib/openmeteo";

export async function GET(req: Request) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const url = new URL(req.url);
    const q = listQuerySchema.parse(Object.fromEntries(url.searchParams));

    const where: Prisma.WeatherRequestWhereInput = {};
    if (q.location) {
      where.location = { name: { contains: q.location, mode: "insensitive" } };
    }
    if (q.from) {
      where.startDate = { ...(typeof where.startDate === "object" ? where.startDate : {}), gte: new Date(q.from) };
    }
    if (q.to) {
      where.endDate = { ...(typeof where.endDate === "object" ? where.endDate : {}), lte: new Date(q.to) };
    }
    if (q.favorite === "true") where.isFavorite = true;
    if (q.favorite === "false") where.isFavorite = false;

    const [items, total] = await prisma.$transaction([
      prisma.weatherRequest.findMany({
        where,
        orderBy: { createdAt: q.sort },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { location: true, _count: { select: { observations: true } } },
      }),
      prisma.weatherRequest.count({ where }),
    ]);

    return jsonOk({
      items,
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

interface ResolvedLocation {
  name: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

// Resolves the request's location input to concrete coordinates and a display
// name. Query input goes through geocoding (404 when nothing matches); raw
// coordinates are stored under a "lat, lon" name.
async function resolveLocation(input: CreateRequestInput["location"]): Promise<ResolvedLocation> {
  if ("query" in input) {
    const found = await searchLocations(input.query, 1);
    if (found.length === 0) {
      throw new NotFoundError(`No place found matching "${input.query}".`);
    }
    const first = found[0];
    return {
      name: first.name,
      region: first.region,
      country: first.country,
      countryCode: first.countryCode,
      latitude: first.latitude,
      longitude: first.longitude,
      timezone: first.timezone,
    };
  }
  const { latitude, longitude } = input;
  return {
    name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    latitude,
    longitude,
  };
}

// Local error that maps to 404 in POST (the shared handler only maps P2025).
class NotFoundError extends Error {}

function toObservationRows(daily: DailyWeather[], requestId: number) {
  return daily.map((d) => ({
    requestId,
    observationDate: new Date(d.date),
    temperatureMin: d.tempMin,
    temperatureMax: d.tempMax,
    temperatureMean:
      d.tempMin != null && d.tempMax != null ? (d.tempMin + d.tempMax) / 2 : null,
    precipitation: d.precipitationSum,
    humidity: d.humidityMean,
    windSpeed: d.windSpeedMax,
    weatherCode: d.weatherCode,
    source: "open-meteo",
  }));
}

export async function POST(req: Request) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const body = createRequestSchema.parse(await req.json());

    const resolved = await resolveLocation(body.location).catch((err: unknown) => {
      if (err instanceof NotFoundError) throw err;
      throw err;
    });

    const location = await prisma.location.upsert({
      where: {
        latitude_longitude: { latitude: resolved.latitude, longitude: resolved.longitude },
      },
      update: {},
      create: {
        name: resolved.name,
        region: resolved.region ?? null,
        country: resolved.country ?? null,
        countryCode: resolved.countryCode ?? null,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        timezone: resolved.timezone ?? null,
      },
    });

    // Observations are always stored in metric units so exports are consistent.
    const daily = await getDateRangeWeather(
      resolved.latitude,
      resolved.longitude,
      body.startDate,
      body.endDate,
      "celsius",
    );
    if (daily.length === 0) {
      return jsonError("The weather service returned no data for this date range.", 502, "weather_provider_error");
    }

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.weatherRequest.create({
        data: {
          locationId: location.id,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          label: body.label ?? null,
          notes: body.notes ?? null,
          status: "completed",
        },
        include: { location: true },
      });
      await tx.weatherObservation.createMany({
        data: toObservationRows(daily, created.id),
      });
      return created;
    });

    const observations = await prisma.weatherObservation.findMany({
      where: { requestId: request.id },
      orderBy: { observationDate: "asc" },
    });

    return jsonOk({ request, observations }, 201);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return jsonError(err.message, 404, "not_found");
    }
    return handleRouteError(err);
  }
}

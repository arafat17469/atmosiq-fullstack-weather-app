import { jsonOk, jsonError, getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { updateRequestSchema, validateDateRange } from "@/lib/validation";
import { getDateRangeWeather, type DailyWeather } from "@/lib/openmeteo";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toObservationRows(daily: DailyWeather[], requestId: number) {
  return daily.map((d) => ({
    requestId,
    observationDate: new Date(d.date),
    temperatureMin: d.tempMin,
    temperatureMax: d.tempMax,
    temperatureMean: d.tempMin != null && d.tempMax != null ? (d.tempMin + d.tempMax) / 2 : null,
    precipitation: d.precipitationSum,
    humidity: d.humidityMean,
    windSpeed: d.windSpeedMax,
    weatherCode: d.weatherCode,
    source: "open-meteo",
  }));
}

function dateToString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const id = parseId(params.id);
    if (id == null) return jsonError("Request id is not valid.", 400, "validation_error");

    const request = await prisma.weatherRequest.findUnique({
      where: { id },
      include: {
        location: true,
        observations: { orderBy: { observationDate: "asc" } },
      },
    });
    if (!request) return jsonError("Request not found.", 404, "not_found");

    return jsonOk(request);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const id = parseId(params.id);
    if (id == null) return jsonError("Request id is not valid.", 400, "validation_error");

    const patch = updateRequestSchema.parse(await req.json());

    const existing = await prisma.weatherRequest.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!existing) return jsonError("Request not found.", 404, "not_found");

    // Merge with the stored dates so a partial update still gets a full range check.
    const startDate = patch.startDate ?? dateToString(existing.startDate);
    const endDate = patch.endDate ?? dateToString(existing.endDate);
    const rangeCheck = validateDateRange(startDate, endDate);
    if (!rangeCheck.ok) {
      return jsonError(rangeCheck.message, 400, "validation_error");
    }
    const datesChanged = startDate !== dateToString(existing.startDate) || endDate !== dateToString(existing.endDate);

    const data: {
      label?: string | null;
      notes?: string | null;
      startDate?: Date;
      endDate?: Date;
      isFavorite?: boolean;
    } = {};
    if (patch.label !== undefined) data.label = patch.label;
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.isFavorite !== undefined) data.isFavorite = patch.isFavorite;
    if (datesChanged) {
      data.startDate = new Date(startDate);
      data.endDate = new Date(endDate);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.weatherRequest.update({
        where: { id },
        data,
        include: { location: true },
      });
      if (datesChanged) {
        // Observation rows are provider snapshots and are never edited
        // directly: a date change replaces them wholesale with fresh data.
        const daily = await getDateRangeWeather(
          saved.location.latitude,
          saved.location.longitude,
          startDate,
          endDate,
          "celsius",
        );
        if (daily.length === 0) {
          throw new Error("NO_OBSERVATIONS");
        }
        await tx.weatherObservation.deleteMany({ where: { requestId: id } });
        await tx.weatherObservation.createMany({ data: toObservationRows(daily, id) });
      }
      return saved;
    });

    return jsonOk(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_OBSERVATIONS") {
      return jsonError("The weather service returned no data for the new date range.", 502, "weather_provider_error");
    }
    return handleRouteError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const id = parseId(params.id);
    if (id == null) return jsonError("Request id is not valid.", 400, "validation_error");

    // Observations cascade through the schema relation.
    await prisma.weatherRequest.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

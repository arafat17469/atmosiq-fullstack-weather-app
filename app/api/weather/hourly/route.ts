import { z } from "zod";
import { jsonOk, jsonError, getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { coordQuerySchema, normalizeCoordParams } from "@/lib/validation";
import { weatherCodeInfo } from "@/lib/units";
import { getHourly, type TempUnit } from "@/lib/openmeteo";

const hourlyQuerySchema = coordQuerySchema.extend({
  hours: z.coerce.number().int().min(1).max(168).default(24),
  units: z.enum(["c", "f"]).default("c"),
});

export async function GET(req: Request) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const url = new URL(req.url);
    const query = hourlyQuerySchema.parse(normalizeCoordParams(Object.fromEntries(url.searchParams)));
    const unit: TempUnit = query.units === "f" ? "fahrenheit" : "celsius";

    const hourly = await getHourly(query.latitude, query.longitude, query.hours, unit);
    const withLabels = hourly.map((h) => {
      const info = weatherCodeInfo(h.weatherCode);
      return { ...h, weatherLabel: info.label, weatherEmoji: info.emoji };
    });

    return jsonOk({ hourly: withLabels, units: unit });
  } catch (err) {
    return handleRouteError(err);
  }
}

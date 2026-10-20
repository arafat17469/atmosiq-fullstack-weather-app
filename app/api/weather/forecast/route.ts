import { z } from "zod";
import { jsonOk, jsonError, getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { coordQuerySchema, normalizeCoordParams } from "@/lib/validation";
import { weatherCodeInfo } from "@/lib/units";
import { getForecast, type TempUnit } from "@/lib/openmeteo";

const forecastQuerySchema = coordQuerySchema.extend({
  days: z.coerce.number().int().min(1).max(16).default(7),
  units: z.enum(["c", "f"]).default("c"),
});

export async function GET(req: Request) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const url = new URL(req.url);
    const query = forecastQuerySchema.parse(normalizeCoordParams(Object.fromEntries(url.searchParams)));
    const unit: TempUnit = query.units === "f" ? "fahrenheit" : "celsius";

    const daily = await getForecast(query.latitude, query.longitude, query.days, unit);
    const withLabels = daily.map((d) => {
      const info = weatherCodeInfo(d.weatherCode);
      return { ...d, weatherLabel: info.label, weatherEmoji: info.emoji };
    });

    return jsonOk({ daily: withLabels, units: unit });
  } catch (err) {
    return handleRouteError(err);
  }
}

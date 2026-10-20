import { z } from "zod";
import { jsonOk, jsonError, getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { coordQuerySchema, normalizeCoordParams } from "@/lib/validation";
import { getCurrentWeather, type TempUnit } from "@/lib/openmeteo";

const currentQuerySchema = coordQuerySchema.extend({
  units: z.enum(["c", "f"]).default("c"),
});

export async function GET(req: Request) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const url = new URL(req.url);
    const query = currentQuerySchema.parse(normalizeCoordParams(Object.fromEntries(url.searchParams)));
    const unit: TempUnit = query.units === "f" ? "fahrenheit" : "celsius";

    const weather = await getCurrentWeather(query.latitude, query.longitude, unit);
    return jsonOk(weather);
  } catch (err) {
    return handleRouteError(err);
  }
}

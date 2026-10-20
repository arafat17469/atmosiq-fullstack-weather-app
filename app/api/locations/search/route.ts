import { jsonOk, jsonError, getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchLocations } from "@/lib/openmeteo";

export async function GET(req: Request) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    if (q.length < 2) {
      return jsonError("Please enter at least 2 characters to search.", 400, "validation_error");
    }
    if (q.length > 100) {
      return jsonError("Search text is limited to 100 characters.", 400, "validation_error");
    }

    const rawCount = Number(url.searchParams.get("count") ?? "5");
    const count = Number.isFinite(rawCount) ? Math.min(Math.max(Math.floor(rawCount), 1), 20) : 5;

    const results = await searchLocations(q, count);
    return jsonOk(results);
  } catch (err) {
    return handleRouteError(err);
  }
}

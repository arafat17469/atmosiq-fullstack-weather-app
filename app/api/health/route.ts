import { jsonOk, getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return new Response(JSON.stringify({ error: { message: "Too many requests.", code: "rate_limited" } }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(gate.retryAfterSec ?? 60) },
    });
  }
  try {
    return jsonOk({ status: "ok", time: new Date().toISOString() });
  } catch (err) {
    return handleRouteError(err);
  }
}

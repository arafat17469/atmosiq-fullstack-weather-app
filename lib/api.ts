import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { OpenMeteoError } from "./openmeteo";

// Success envelope: { data: ... }
export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

// Error envelope: { error: { message, code } }
export function jsonError(message: string, status: number, code = "error"): NextResponse {
  return NextResponse.json({ error: { message, code } }, { status });
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return "unknown";
}

function zodMessage(err: ZodError): string {
  const first = err.issues[0];
  return first?.message ?? "The input was not valid.";
}

// Maps thrown errors to safe HTTP responses. Never leaks stack traces or
// provider internals to the client; details go to server logs instead.
export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return jsonError(zodMessage(err), 400, "validation_error");
  }
  if (err instanceof OpenMeteoError) {
    return jsonError(err.message, 502, "weather_provider_error");
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return jsonError("The requested item was not found.", 404, "not_found");
  }
  console.error("Unhandled route error:", err);
  return jsonError("Something went wrong. Please try again later.", 500, "internal_error");
}
